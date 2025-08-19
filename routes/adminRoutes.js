// routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const Profile = require('../models/Profile'); 
const User = require('../models/User');    
const bcrypt = require('bcryptjs');

// Middleware para asegurar que las vistas de admin usen el layout del admin
router.use((req, res, next) => {
    res.locals.layout = 'layouts/adminLayout';
    next();
});

// --- Middleware de Autenticación ---
const isAuthenticated = (req, res, next) => {
    if (req.session && req.session.userId) {
        return next();
    }
    // Si no está autenticado, guarda un mensaje en la sesión y redirige al login
    req.session.message = { type: 'error', text: 'Por favor, inicia sesión para acceder.' };
    res.redirect('/admin/login');
};

// Ruta para la página de inicio del panel de administración (Dashboard)
// Ahora es asíncrona para poder consultar la base de datos
router.get('/', isAuthenticated, async (req, res) => {
    // Obtener y limpiar mensajes flash de la sesión para mostrar en el dashboard
    const message = req.session.message;
    delete req.session.message;

    try {
        // Obtener todos los perfiles de la base de datos
        // Puedes añadir .sort({ createdAt: -1 }) para ordenar por fecha de creación, por ejemplo
        const profiles = await Profile.find({}); 

        res.render('admin/dashboard', {
            title: 'Panel Principal',
            profiles: profiles, // Pasa los perfiles a la vista
            // Pasa los mensajes a la vista, usando el mismo formato que login.ejs espera
            error: message && message.type === 'error' ? message.text : '',
            success: message && message.type === 'success' ? message.text : ''
        });
    } catch (err) {
        console.error('Error al obtener perfiles para el dashboard:', err);
        // En caso de error, renderiza el dashboard con un mensaje de error y sin perfiles
        res.status(500).render('admin/dashboard', {
            title: 'Panel Principal',
            profiles: [], // Pasa un array vacío para evitar errores en la vista EJS
            error: 'Error al cargar los perfiles del sistema.',
            success: ''
        });
    }
});

// Ruta para el login del administrador (GET)
router.get('/login', (req, res) => {
    // Si el usuario ya está logueado, redirige al dashboard
    if (req.session && req.session.userId) {
        return res.redirect('/admin');
    }

    // Obtener y limpiar mensajes de la sesión si existen
    // Estos mensajes provienen de redirecciones (ej. desde isAuthenticated o /logout)
    const message = req.session.message;
    delete req.session.message;

    res.render('admin/login', {
        title: 'Login Administrador',
        error: message && message.type === 'error' ? message.text : '',
        success: message && message.type === 'success' ? message.text : '',
        layout: false // La página de login usa un layout diferente o ninguno
    });
});

// Ruta para manejar el POST del formulario de login
router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const user = await User.findOne({ username: username });

        if (!user) {
            // Envía una respuesta JSON con el mensaje de error para el frontend (SweetAlert2)
            return res.status(401).json({ message: 'Credenciales inválidas.', redirect: '/admin/login' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            // Envía una respuesta JSON con el mensaje de error para el frontend (SweetAlert2)
            return res.status(401).json({ message: 'Credenciales inválidas.', redirect: '/admin/login' });
        }

        req.session.userId = user._id; // Almacena el ID del usuario en la sesión

        // Envía una respuesta JSON de éxito con el mensaje y la URL de redirección
        return res.status(200).json({ message: 'Inicio de sesión exitoso.', redirect: '/admin' });

    } catch (err) {
        console.error('Error en login:', err);
        // Envía una respuesta JSON para errores del servidor
        return res.status(500).json({ message: 'Error en el servidor. Intenta de nuevo.', redirect: '/admin/login' });
    }
});

// --- Ruta para Cerrar Sesión (Logout) ---
router.get('/logout', (req, res) => {
    // Declara una variable para el mensaje antes de destruir la sesión
    let logoutMessage = {};

    req.session.destroy(err => {
        if (err) {
            console.error('Error al destruir sesión:', err);
            // Si hay un error al destruir la sesión, prepara el mensaje de error
            logoutMessage = { type: 'error', text: 'Error al cerrar sesión. Por favor, inténtalo de nuevo.' };
            // Y luego redirige, pasando el mensaje como query parameter si es necesario
            // O manejando el mensaje de otra forma si no puedes usar la sesión para eso
            res.clearCookie('connect.sid'); // Asegura que la cookie se limpie incluso con error
            return res.redirect(`/admin/login?messageType=${logoutMessage.type}&messageText=${encodeURIComponent(logoutMessage.text)}`);
        }
        
        // Si el cierre de sesión es exitoso, prepara el mensaje de éxito
        logoutMessage = { type: 'success', text: 'Has cerrado sesión con éxito.' };
        res.clearCookie('connect.sid'); // Limpia la cookie de sesión del navegador

        // Redirige al usuario. No podemos usar req.session.message aquí porque la sesión ya no existe.
        // La forma más sencilla es usar query parameters para el mensaje si la página de login puede leerlos.
        return res.redirect(`/admin/login?messageType=${logoutMessage.type}&messageText=${encodeURIComponent(logoutMessage.text)}`);
    });
});

// --- Ruta GET para mostrar el formulario de creación de un nuevo perfil ---
router.get('/profiles/new', isAuthenticated, (req, res) => {
    const message = req.session.message;
    delete req.session.message;

    res.render('admin/new', {
        title: 'Crear Nuevo Perfil',
        profile: null, // Se mantiene 'null' para indicar que es un formulario de creación vacío
        error: message && message.type === 'error' ? message.text : '',
        success: message && message.type === 'success' ? message.text : '',
        blockData: {} // <-- ¡Aquí está la corrección! Se añade un objeto vacío por defecto
    });
});

router.post('/profiles/new', isAuthenticated, async (req, res) => {
    try {
        const formData = req.body;

        if (!formData.profileName || !formData.slug) {
            req.session.message = { type: 'error', text: 'El nombre del perfil y el slug son obligatorios.' };
            return res.redirect('/admin/new');
        }

        const existingProfile = await Profile.findOne({ slug: formData.slug });
        if (existingProfile) {
            req.session.message = { type: 'error', text: 'El slug principal ya existe. Por favor, elige otro.' };
            return res.redirect('/admin/new');
        }

        // --- Generar el slug para la página de detalle a partir del slug principal ---
        const detailSlug = formData.slug + '-servicios'; 

        const newProfileData = {
            profileName: formData.profileName,
            slug: formData.slug,
            isActive: formData.isActive === 'on' ? true : false,
            heroSection: {
                mainTitle: formData.heroSection?.mainTitle || '',
                tagline: formData.heroSection?.tagline || '',
                image: formData.heroSection?.image || ''
            },
            
            // Specialized Services
            specializedServices: {
                title: formData.specializedServices?.title || '',
                introText: formData.specializedServices?.introText || '',
                items: Array.isArray(formData.specializedServices?.items)
                    ? formData.specializedServices.items.map(item => ({
                        name: item.name || '',
                        image: item.image || '',
                        description: item.description || '',
                        // Asigna el slug dinámico aquí
                        detailSlug: detailSlug 
                    }))
                    : []
            },
            
            // About Us Section
            aboutUsSection: {
                image: formData.aboutUsSection?.image || '',
                textParagraphs: Array.isArray(formData.aboutUsSection?.textParagraphs)
                    ? formData.aboutUsSection.textParagraphs.filter(p => p !== null && p !== undefined)
                    : []
            },

            // Philosophy Section
            philosophySection: {
                mision: {
                    text: formData.philosophySection?.mision?.text || ''
                },
                vision: {
                    text: formData.philosophySection?.vision?.text || ''
                },
                valores: {
                    items: Array.isArray(formData.philosophySection?.valores?.items)
                        ? formData.philosophySection.valores.items.filter(v => v !== null && v !== undefined)
                        : []
                }
            },

            // Services Overview (Carousel)
            servicesOverview: {
                introText: formData.servicesOverview?.introText || '',
                slides: Array.isArray(formData.servicesOverview?.slides)
                    ? formData.servicesOverview.slides.map(slide => ({
                        name: slide.name || '',
                        image: slide.image || '',
                        // Asigna el slug dinámico aquí
                        detailSlug: detailSlug 
                    }))
                    : []
            },
            
            // Clients Section
            clientsSection: {
                clientLogos: Array.isArray(formData.clientsSection?.clientLogos)
                    ? formData.clientsSection.clientLogos.map(logo => ({
                        image: logo.image || '',
                        altText: logo.altText || ''
                    }))
                    : []
            },

            // Contact Section
            contactSection: {
                direction: formData.contactSection?.direction || '',
                telefono: formData.contactSection?.telefono || '',
                correo: formData.contactSection?.correo || '',
                horario1: formData.contactSection?.horario1 || '',
                horario2: formData.contactSection?.horario2 || '',
                contactImage: formData.contactSection?.contactImage || ''
            },

            // Item Details (Nested Detail Pages for Products/Services)
            itemDetails: Array.isArray(formData.itemDetails)
                ? formData.itemDetails.map(itemDetail => {
                    return {
                        itemSlug: detailSlug, // Usa el slug dinámico
                        hero: {
                            title: itemDetail.hero?.title || '',
                            subtitle: itemDetail.hero?.subtitle || '',
                            backgroundImage: itemDetail.hero?.backgroundImage || ''
                        },
                        intro: {
                            paragraph1: itemDetail.intro?.paragraph1 || '',
                            paragraph2: itemDetail.intro?.paragraph2 || '',
                            paragraph3: itemDetail.intro?.paragraph3 || ''
                        },
                        contentSections: Array.isArray(itemDetail.contentSections)
                            ? itemDetail.contentSections.map(block => ({
                                title: block.title || '',
                                text: block.text || '',
                                image: block.image || '',
                                imageCaption: block.imageCaption || '',
                                isReversed: block.isReversed === 'on' ? true : false
                            }))
                            : [],
                        contactInfo: {
                            title: itemDetail.contactInfo?.title || '',
                            companyName: itemDetail.contactInfo?.companyName || '',
                            companyDetail: itemDetail.contactInfo?.companyDetail || '',
                            phone: itemDetail.contactInfo?.phone || '',
                            email: itemDetail.contactInfo?.email || ''
                        }
                    };
                })
                : []
        };

        const newProfile = new Profile(newProfileData);
        await newProfile.save();

        req.session.message = { type: 'success', text: 'Perfil creado exitosamente.' };
        res.redirect('/admin');
    } catch (err) {
        console.error('Error al crear perfil:', err);
        let errorMessage = 'Error al crear el perfil. Verifica los datos.';
        if (err.code === 11000) {
            errorMessage = 'Ya existe un perfil o un ítem de detalle con uno de los slugs proporcionados. Por favor, revisa y asegúrate de que todos los slugs sean únicos.';
        }
        
        req.session.message = { type: 'error', text: errorMessage };
        res.redirect('/admin/profiles/new');
    }
});

// --- Ruta DELETE para eliminar un perfil ---
router.delete('/profiles/delete/:id', isAuthenticated, async (req, res) => {
    try {
        const profileId = req.params.id;

        // Encuentra y elimina el perfil por su ID
        const deletedProfile = await Profile.findByIdAndDelete(profileId);

        if (!deletedProfile) {
            req.session.message = { type: 'error', text: 'Perfil no encontrado.' };
            return res.redirect('/admin');
        }

        req.session.message = { type: 'success', text: `Perfil "${deletedProfile.profileName}" eliminado exitosamente.` };
        res.redirect('/admin');

    } catch (err) {
        console.error('Error al eliminar perfil:', err);
        req.session.message = { type: 'error', text: 'Error al eliminar el perfil. Intenta de nuevo.' };
        res.redirect('/admin');
    }
});

router.get('/profiles/edit/:id', isAuthenticated, async (req, res) => {
    try {
        const profileId = req.params.id;
        const profile = await Profile.findById(profileId);

        if (!profile) {
            req.session.message = { type: 'error', text: 'Perfil no encontrado.' };
            return res.redirect('/admin');
        }

        const message = req.session.message;
        delete req.session.message;

        res.render('admin/edit', {
            title: 'EDITAR PERFIL',
            profile: profile,
            error: message && message.type === 'error' ? message.text : '',
            success: message && message.type === 'success' ? message.text : ''
        });
    } catch (err) {
        console.error('Error al obtener perfil para edición:', err);
        req.session.message = { type: 'error', text: 'Error al cargar el perfil. Intenta de nuevo.' };
        res.redirect('/admin');
    }
});

router.put('/profiles/edit/:id', isAuthenticated, async (req, res) => {
    try {
        const profileId = req.params.id;
        const formData = req.body;

        // 1. Obtener el perfil original de la base de datos
        const originalProfile = await Profile.findById(profileId);
        if (!originalProfile) {
            req.session.message = { type: 'error', text: 'Perfil no encontrado.' };
            return res.redirect('/admin');
        }

        // 2. Verificar si el slug principal fue cambiado y si el nuevo ya existe
        if (formData.slug !== originalProfile.slug) {
            const existingProfile = await Profile.findOne({ slug: formData.slug });
            if (existingProfile && existingProfile._id.toString() !== profileId) {
                req.session.message = { type: 'error', text: 'El nuevo slug principal ya existe. Por favor, elige otro.' };
                return res.redirect(`/admin/profiles/edit/${profileId}`);
            }
        }

        // 3. Generar el slug de detalle basado en el slug del formulario (el nuevo o el original si no se cambió)
        const detailSlug = formData.slug + '-servicios';

        // Prepara los datos para la actualización
        const updatedProfileData = {
            profileName: formData.profileName,
            slug: formData.slug,
            isActive: formData.isActive === 'on' ? true : false,
            heroSection: {
                mainTitle: formData.heroSection?.mainTitle || '',
                tagline: formData.heroSection?.tagline || '',
                image: formData.heroSection?.image || ''
            },
            specializedServices: {
                title: formData.specializedServices?.title || '',
                introText: formData.specializedServices?.introText || '',
                items: Array.isArray(formData.specializedServices?.items) ? formData.specializedServices.items.map(item => ({
                    name: item.name || '',
                    image: item.image || '',
                    description: item.description || '',
                    detailSlug: detailSlug // Usar el slug dinámico
                })) : []
            },
            aboutUsSection: {
                image: formData.aboutUsSection?.image || '',
                textParagraphs: Array.isArray(formData.aboutUsSection?.textParagraphs) ? formData.aboutUsSection.textParagraphs.filter(p => p !== null && p !== undefined) : []
            },
            philosophySection: {
                mision: { text: formData.philosophySection?.mision?.text || '' },
                vision: { text: formData.philosophySection?.vision?.text || '' },
                valores: { items: Array.isArray(formData.philosophySection?.valores?.items) ? formData.philosophySection.valores.items.filter(v => v !== null && v !== undefined) : [] }
            },
            servicesOverview: {
                introText: formData.servicesOverview?.introText || '',
                slides: Array.isArray(formData.servicesOverview?.slides) ? formData.servicesOverview.slides.map(slide => ({
                    name: slide.name || '',
                    image: slide.image || '',
                    detailSlug: detailSlug // Usar el slug dinámico
                })) : []
            },
            clientsSection: {
                clientLogos: Array.isArray(formData.clientsSection?.clientLogos) ? formData.clientsSection.clientLogos.map(logo => ({
                    image: logo.image || '',
                    altText: logo.altText || ''
                })) : []
            },
            contactSection: {
                direction: formData.contactSection?.direction || '',
                telefono: formData.contactSection?.telefono || '',
                correo: formData.contactSection?.correo || '',
                horario1: formData.contactSection?.horario1 || '',
                horario2: formData.contactSection?.horario2 || '',
                contactImage: formData.contactSection?.contactImage || ''
            },
            itemDetails: Array.isArray(formData.itemDetails) ? formData.itemDetails.map(itemDetail => ({
                itemSlug: detailSlug, // Usar el slug dinámico
                hero: {
                    title: itemDetail.hero?.title || '',
                    subtitle: itemDetail.hero?.subtitle || '',
                    backgroundImage: itemDetail.hero?.backgroundImage || ''
                },
                intro: {
                    paragraph1: itemDetail.intro?.paragraph1 || '',
                    paragraph2: itemDetail.intro?.paragraph2 || '',
                    paragraph3: itemDetail.intro?.paragraph3 || ''
                },
                contentSections: Array.isArray(itemDetail.contentSections) ? itemDetail.contentSections.map(block => ({
                    title: block.title || '',
                    text: block.text || '',
                    image: block.image || '',
                    imageCaption: block.imageCaption || '',
                    isReversed: block.isReversed === 'on' ? true : false
                })) : [],
                contactInfo: {
                    title: itemDetail.contactInfo?.title || '',
                    companyName: itemDetail.contactInfo?.companyName || '',
                    companyDetail: itemDetail.contactInfo?.companyDetail || '',
                    phone: itemDetail.contactInfo?.phone || '',
                    email: itemDetail.contactInfo?.email || ''
                }
            })) : []
        };
        
        // Ejecuta la actualización en la base de datos
        const updatedProfile = await Profile.findByIdAndUpdate(profileId, updatedProfileData, { new: true });

        if (!updatedProfile) {
            req.session.message = { type: 'error', text: 'Perfil no encontrado.' };
            return res.redirect('/admin');
        }

        req.session.message = { type: 'success', text: 'Perfil actualizado exitosamente.' };
        res.redirect(`/admin/profiles/edit/${profileId}`);

    } catch (err) {
        console.error('Error al actualizar perfil:', err);
        let errorMessage = 'Error al actualizar el perfil. Verifica los datos.';
        if (err.code === 11000) {
             errorMessage = 'Ya existe un perfil o un ítem de detalle con uno de los slugs proporcionados. Por favor, revisa y asegúrate de que todos los slugs sean únicos.';
        }
        
        req.session.message = { type: 'error', text: errorMessage };
        res.redirect(`/admin/profiles/edit/${req.params.id}`);
    }
});

module.exports = router;
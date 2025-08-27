// routes/publicRoutes.js
const express = require('express');
const router = express.Router();
const Profile = require('../models/Profile');

router.get('/', async (req, res) => {
    try {
        const activeProfile = await Profile.findOne({ isActive: true }); 
        
        if (!activeProfile) {
            console.warn('No se encontró ningún perfil activo en la base de datos.');
            return res.status(404).render('error', { 
                title: 'No hay perfil activo',
                message: 'No hay un perfil activo para mostrar en la página de inicio. Por favor, activa uno en el panel de administración.'
            });
        }
        
        res.render('servicio/index', { 
            profile: activeProfile, 
            title: activeProfile.profileName + ' | JEGUEN SOLUTIONS' 
        });
    } catch (err) {
        console.error('Error al cargar la página principal:', err);
        res.status(500).render('error', { message: 'Error interno del servidor al cargar la página principal.', title: 'Error' });
    }
});

// Ruta para las páginas de perfil principal 
router.get('/servicio/:slug', async (req, res) => {
    try {
        const { slug } = req.params;
        const profile = await Profile.findOne({ slug: slug, isActive: true }); 

        if (!profile) {
            return res.status(404).render('error', { 
                title: 'Perfil no encontrado', 
                message: `Perfil de servicio "${slug}" no encontrado o no está activo.` 
            });
        }
        res.render('servicio/index', { profile: profile, title: profile.profileName + ' | JEGUEN SOLUTIONS' });
    } catch (err) {
        console.error(`Error al cargar el perfil "${req.params.slug}":`, err);
        res.status(500).render('error', { message: 'Error interno del servidor al cargar el perfil.', title: 'Error' });
    }
});

// Ruta para las páginas de detalle de ítems (ej. /servicio/proteccion-civil/impermeables)
router.get('/servicio/:profileSlug/:itemSlug', async (req, res) => {
    try {
        const { profileSlug, itemSlug } = req.params;

        const profile = await Profile.findOne({ slug: profileSlug, isActive: true });
        
        if (!profile) {
            return res.status(404).render('error', { 
                title: 'Perfil no encontrado', 
                message: `Perfil principal "${profileSlug}" no encontrado o no está activo para el detalle.` 
            });
        }

        // Busca el ítem de detalle dentro de la colección itemDetails del perfil
        const itemDetail = profile.itemDetails.find(item => item.itemSlug === itemSlug);
        
        if (!itemDetail) {
            return res.status(404).render('error', { 
                title: 'Detalle no encontrado', 
                message: `Detalle de producto/servicio "${itemSlug}" no encontrado dentro de ${profileSlug}.` 
            });
        }

        // Pasa el objeto 'itemDetail' a la plantilla.
        res.render('servicio/detail', { 
            itemDetail: itemDetail, 
            title: itemDetail.hero.title + ' | JEGUEN SOLUTIONS' 
        });
        
    } catch (err) {
        console.error(`Error al cargar el detalle "${req.params.itemSlug}" del perfil "${req.params.profileSlug}":`, err);
        res.status(500).render('error', { message: 'Error interno del servidor al cargar el detalle.', title: 'Error' });
    }
});

module.exports = router;

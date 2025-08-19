// routes/mainRoutes.js
const express = require('express');
const router = express.Router();
const Profile = require('../models/Profile'); // Asegúrate de que la ruta a tu modelo sea correcta

/**
 * @route GET /licitacion/:slug
 * @description Muestra la página principal de un perfil de licitación específico.
 */
router.get('/:slug', async (req, res) => {
    try {
        const profileSlug = req.params.slug;
        const profile = await Profile.findOne({ slug: profileSlug, isActive: true });

        if (!profile) {
            // Si no se encuentra el perfil o no está activo, muestra un 404
            return res.status(404).render('error', { 
                title: 'Perfil no encontrado',
                message: 'Lo sentimos, el perfil de servicio que buscas no existe o no está activo.' 
            });
        }

        // Renderiza la plantilla principal de la licitación y le pasa el objeto completo del perfil
        res.render('servicio/index', {
            profile: profile,
            title: profile.profileName 
        });

    } catch (err) {
        console.error(err);
        res.status(500).render('error', { 
            title: 'Error del Servidor',
            message: 'Ocurrió un error inesperado al cargar la página. Por favor, inténtalo de nuevo más tarde.' 
        });
    }
});

/**
 * @route 
 * @description 
 */
router.get('/:profileSlug/:itemSlug', async (req, res) => {
    try {
        const { profileSlug, itemSlug } = req.params;

        // Primero, encuentra el perfil principal
        const profile = await Profile.findOne({ slug: profileSlug, isActive: true });

        if (!profile) {
            return res.status(404).render('error', { 
                title: 'Perfil no encontrado',
                message: 'El perfil de licitación que buscas no existe o no está activo.' 
            });
        }

        // Luego, busca el ítem de detalle dentro de la colección itemDetails del perfil
        const itemDetail = profile.itemDetails.find(item => item.itemSlug === itemSlug);

        if (!itemDetail) {
            return res.status(404).render('error', { 
                title: 'Ítem de Detalle no encontrado',
                message: 'El servicio o producto de licitación que buscas no existe en este perfil.' 
            });
        }

        // Renderiza la plantilla de detalle y le pasa los objetos necesarios
        res.render('servicio/detail', {
            profile: profile,     
            itemDetail: itemDetail, 
            title: itemDetail.hero.title
        });

    } catch (err) {
        console.error(err);
        res.status(500).render('error', { 
            title: 'Error del Servidor',
            message: 'Ocurrió un error inesperado al cargar la página de detalle.' 
        });
    }
});

module.exports = router;
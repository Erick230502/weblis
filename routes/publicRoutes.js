// routes/publicRoutes.js
const express = require('express');
const router = express.Router();
const Profile = require('../models/Profile'); 

// Ruta principal (tu index.ejs dinámico)
router.get('/', async (req, res) => {
  try {
    const defaultProfile = await Profile.findOne({ slug: 'proteccion-civil' }); 
    if (!defaultProfile) {
      console.warn('No se encontró el perfil por defecto "proteccion-civil". Asegúrate de crearlo en la DB.');
      return res.render('index', { currentProfile: null, title: 'JEGUEN SOLUTIONS' });
    }
    res.render('index', { currentProfile: defaultProfile, title: defaultProfile.profileName + ' | JEGUEN SOLUTIONS' });
  } catch (err) {
    console.error('Error al cargar la página principal:', err);
    res.status(500).render('error', { message: 'Error interno del servidor al cargar la página principal.', title: 'Error' });
  }
});

// Ruta para las páginas de perfil principal (ej. /licitacion/tecnologia)
router.get('/servicio/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const profile = await Profile.findOne({ slug: slug });

    if (!profile) {
      return res.status(404).render('error', { message: `Perfil de servicio "${slug}" no encontrado.`, title: 'Perfil No Encontrado' });
    }
    res.render('index', { currentProfile: profile, title: profile.profileName + ' | JEGUEN SOLUTIONS' });
  } catch (err) {
    console.error(`Error al cargar el perfil "${req.params.slug}":`, err);
    res.status(500).render('error', { message: 'Error interno del servidor al cargar el perfil.', title: 'Error' });
  }
});

// Ruta para las páginas de detalle de ítems (ej. /licitacion/proteccion-civil/impermeables)
router.get('/servicio/:profileSlug/:itemSlug', async (req, res) => {
  try {
    const { profileSlug, itemSlug } = req.params;

    const profile = await Profile.findOne({ slug: profileSlug });
    if (!profile) {
      return res.status(404).render('error', { message: `Perfil principal "${profileSlug}" no encontrado para el detalle.`, title: 'Perfil No Encontrado' });
    }

    const detailItem = profile.itemDetails.find(item => item.itemSlug === itemSlug);
    if (!detailItem) {
      return res.status(404).render('error', { message: `Detalle de producto/servicio "${itemSlug}" no encontrado dentro de ${profileSlug}.`, title: 'Detalle No Encontrado' });
    }

    res.render('servicio/product_detail', { detailItem: detailItem, title: detailItem.hero.title + ' | JEGUEN SOLUTIONS' });
  } catch (err) {
    console.error(`Error al cargar el detalle "${req.params.itemSlug}" del perfil "${req.params.profileSlug}":`, err);
    res.status(500).render('error', { message: 'Error interno del servidor al cargar el detalle.', title: 'Error' });
  }
});

module.exports = router;
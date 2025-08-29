// models/Profile.js
const mongoose = require('mongoose');

// --- Sub-esquemas para los arrays y objetos anidados ---

// Esquema para un elemento dentro de la sección 'specializedServices'
const specializedItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  image: { type: String, required: true },
  description: { type: String, required: true },
  detailSlug: { type: String, required: true }
}, { _id: false });

// Esquema para un elemento dentro de la sección 'servicesOverview' (carrusel)
const serviceSlideSchema = new mongoose.Schema({
  name: { type: String, required: true },
  image: { type: String, required: true }, 
  detailSlug: { type: String, required: true }
}, { _id: false });

// Esquema para un elemento dentro de la sección 'clientsSection'
const clientLogoSchema = new mongoose.Schema({
  image: { type: String, required: true }, 
  altText: { type: String }
}, { _id: false });

// Esquema para la sección de 'contacto' (objeto singular)
const contactInfoSchema = new mongoose.Schema({
  direction: { type: String, required: true },
  telefono: { type: String, required: true },
  correo: { type: String, required: true },
  horario1: { type: String }, 
  horario2: { type: String }, 
  contactImage: { type: String } 
}, { _id: false });

// --- Sub-esquemas para las SECCIONES DE DETALLE de productos/servicios ---

// Esquema para cada bloque de contenido dentro de una página de detalle (texto + imagen)
const detailContentBlockSchema = new mongoose.Schema({
  title: { type: String, required: true },
  text: { type: String }, 
  image: { type: String, required: true }, 
  imageCaption: { type: String }, 
  isReversed: { type: Boolean, default: false }
}, { _id: false });

// Esquema para la información de contacto específica de un ítem de detalle
const detailContactInfoSchema = new mongoose.Schema({
  title: { type: String }, 
  companyName: { type: String }, 
  companyDetail: { type: String }, 
  phone: { type: String },
  email: { type: String }
}, { _id: false });


// Esquema principal para un ÍTEM DE DETALLE 
const detailItemSchema = new mongoose.Schema({
  itemSlug: { 
    type: String,
    required: true,
    unique: true, 
    lowercase: true,
    trim: true
  },
  
  // Sección Hero de la página de detalle
  hero: {
    title: { type: String, required: true },
    subtitle: { type: String },
    backgroundImage: { type: String } 
  },
  
  intro: {
    paragraph1: { type: String },
    paragraph2: { type: String },
    paragraph3: { type: String }
  },
  
  contentSections: [detailContentBlockSchema],
  
  contactInfo: detailContactInfoSchema
}, { _id: false });


// --- Esquema Principal para el PERFIL DE LICITACIÓN (Profile) ---
const profileSchema = new mongoose.Schema({
  profileName: { 
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  slug: { 
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  
  // --- SECCIONES DE LA PÁGINA PRINCIPAL---
  
  // Sección "EQUIPAMIENTO ESTRATÉGICO"
  specializedServices: {
    title: { type: String },
    introText: { type: String },
    items: [specializedItemSchema] 
  },

  // Sección "SOLUCIONES QUE TRANSFORMAN" (Hero Section del index)
  heroSection: {
    mainTitle: { type: String },
    tagline: { type: String },
    image: { type: String } 
  },

  // Sección "Nosotros"
  aboutUsSection: {
    image: { type: String }, 
    textParagraphs: [{ type: String }] 
  },

  // Sección "Filosofía"
  philosophySection: {
    mision: {
      text: { type: String }
    },
    vision: {
      text: { type: String }
    },
    valores: {
      items: [{ type: String }]
    }
  },

  // Sección "SERVICIOS" (carrusel de servicios en el index)
  servicesOverview: {
    introText: { type: String },
    slides: [serviceSlideSchema] 
  },

  // Sección "CLIENTES"
  clientsSection: {
    clientLogos: [clientLogoSchema] 
  },

  // Sección "CONTÁCTANOS"
  contactSection: contactInfoSchema,

  // --- CONTENIDO DE LAS PÁGINAS DE DETALLE DE PRODUCTOS/SERVICIOS ---
  itemDetails: [detailItemSchema], 

  // --- Campos adicionales para la gestión de la plantilla/perfil ---
  isActive: { type: Boolean, default: true } 
}, { timestamps: true });

module.exports = mongoose.model('Profile', profileSchema);
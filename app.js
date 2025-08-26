// app.js
const express = require('express');
const app = express();
const expressLayouts = require('express-ejs-layouts');
const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const session = require('express-session');
const methodOverride = require('method-override');

dotenv.config();

// --- Conexión a la Base de Datos ---
const DB_URI = process.env.MONGODB_URI;
mongoose.connect(DB_URI)
  .then(() => console.log('Conexión a MongoDB establecida con éxito.'))
  .catch(err => console.error('Error al conectar a MongoDB:', err));

// --- Configuraciones de Express y EJS ---
app.use(expressLayouts);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('layout', 'layouts/layout');

// Servir archivos estáticos (CSS, imágenes, JS del cliente)
app.use(express.static(path.join(__dirname, 'public')));

// Middleware para parsear JSON y URL-encoded bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(methodOverride('_method'));

// --- Configuración de Sesiones ---
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
        maxAge: 1000 * 60 * 60 * 24
    }
}));

// --- Importar Rutas ---
const adminRoutes = require("./routes/adminRoutes");
const publicRoutes = require("./routes/publicRoutes");

// --- Usar Rutas ---
app.use('/admin', adminRoutes);
// AHORA SOLO USAMOS publicRoutes para todas las rutas públicas
app.use('/', publicRoutes);

// --- Manejo de errores 404 (si ninguna ruta coincide) ---
app.use((req, res, next) => {
  res.status(404).render('error', { message: 'Página no encontrada', title: 'Error 404' });
});

// Iniciar servidor
const PORT = process.env.PORT || 9000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
    console.log(`Accede a la página principal: http://localhost:${PORT}`);
    console.log(`Accede al panel de administración: http://localhost:${PORT}/admin`);
});
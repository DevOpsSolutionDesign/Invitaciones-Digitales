/**
 * js/fuentes.js
 * Catálogo compartido de fuentes
 */

export const CATEGORIAS_FUENTES = [
  {
    categoria: "Manuscritas / Caligráficas",
    fuentes: [
      { nombre: "Great Vibes", fallback: "cursive" },
      { nombre: "Dancing Script", fallback: "cursive" },
      { nombre: "Alex Brush", fallback: "cursive" },
      { nombre: "Sacramento", fallback: "cursive" },
      { nombre: "Parisienne", fallback: "cursive" },
      { nombre: "Tangerine", fallback: "cursive" },
      { nombre: "Pinyon Script", fallback: "cursive" },
      { nombre: "Allura", fallback: "cursive" },
      { nombre: "Rouge Script", fallback: "cursive" },
      { nombre: "Italianno", fallback: "cursive" },
      { nombre: "Mrs Saint Delafield", fallback: "cursive" },
      { nombre: "Herr Von Muellerhoff", fallback: "cursive" },
	  { nombre: "Mea Culpa", fallback: "cursive" }
    ]
  },

  {
    categoria: "Góticas / Ornamentales",
    fuentes: [
      { nombre: "UnifrakturMaguntia", fallback: "serif" },
      { nombre: "UnifrakturCook", fallback: "serif" },
      { nombre: "Pirata One", fallback: "serif" },
      { nombre: "Cinzel Decorative", fallback: "serif" },
      { nombre: "MedievalSharp", fallback: "serif" }
    ]
  },

  {
    categoria: "Elegantes / Serif",
    fuentes: [
      { nombre: "Playfair Display", fallback: "serif" },
      { nombre: "Cormorant Garamond", fallback: "serif" },
      { nombre: "Libre Baskerville", fallback: "serif" },
      { nombre: "Cormorant", fallback: "serif" },
      { nombre: "EB Garamond", fallback: "serif" },
      { nombre: "Bodoni Moda", fallback: "serif" },
      { nombre: "Prata", fallback: "serif" },
      { nombre: "Lora", fallback: "serif" },
      { nombre: "DM Serif Display", fallback: "serif" },
      { nombre: "Merriweather", fallback: "serif" }
    ]
  },

  {
    categoria: "Modernas / Limpias",
    fuentes: [
      { nombre: "Montserrat", fallback: "sans-serif" },
      { nombre: "Poppins", fallback: "sans-serif" },
      { nombre: "Raleway", fallback: "sans-serif" },
      { nombre: "Nunito Sans", fallback: "sans-serif" }
    ]
  }
];

/**
 * Objeto indexado por nombre
 *
 * FUENTES_CATALOGO["Great Vibes"]
 */
export const FUENTES_CATALOGO = CATEGORIAS_FUENTES.reduce((catalogo, grupo) => {

  grupo.fuentes.forEach((fuente) => {

    catalogo[fuente.nombre] = {
      ...fuente,
      categoria: grupo.categoria
    };

  });

  return catalogo;

}, {});

/**
 * Set para validar nombres.
 *
 * NOMBRES_FUENTES_VALIDAS.has("Montserrat")
 */
export const NOMBRES_FUENTES_VALIDAS = new Set(
  Object.keys(FUENTES_CATALOGO)
);

/**
 * Devuelve el fallback CSS adecuado.
 */
export function fallbackDe(nombre) {

  return FUENTES_CATALOGO[nombre]?.fallback || "sans-serif";

}

/**
 * Devuelve la información completa de una fuente.
 */
export function obtenerFuente(nombre) {

  return FUENTES_CATALOGO[nombre] || null;

}

/**
 * Devuelve las fuentes de una categoría.
 */
export function obtenerCategoria(nombreCategoria) {

  return CATEGORIAS_FUENTES.find(
    c => c.categoria === nombreCategoria
  ) || null;

}

/**
 * Lista plana de fuentes.
 */
export function listarFuentes() {

  return Object.values(FUENTES_CATALOGO);

}
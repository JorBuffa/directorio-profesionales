// src/utils/buscadorInteligente.js
import { supabase } from "../api/supabaseClient";

export async function interpretarBusqueda(textoIngresado) {
  if (!textoIngresado) return "";
  const textoMinuscula = textoIngresado.toLowerCase().trim();

  try {
    // 1. Consultamos los rubros y el diccionario de sinónimos desde Supabase
    const { data: diccionario, error } = await supabase
      .from('diccionario_sinonimos')
      .select('rubro_id, palabra, rubros(nombre)');

    if (error || !diccionario) {
      console.error("Error al consultar el diccionario en Supabase:", error);
      return textoIngresado;
    }

    // 2. Recorremos cada registro guardado en la base de datos
    for (const item of diccionario) {
      if (!item.palabra || !item.rubros) continue;

      // Separamos las palabras clave por comas
      const palabrasClave = item.palabra.split(',').map(p => p.trim().toLowerCase());

      // Verificamos si alguna de las palabras clave está contenida en la frase del usuario
      const coincide = palabrasClave.some(palabra => {
        if (!palabra) return false;
        return textoMinuscula.includes(palabra);
      });

      if (coincide) {
        // Normalizamos el nombre del rubro: pasamos a minúsculas y removemos tildes (ej: "Barbería" -> "barberia")
        const nombreRubroLimpio = item.rubros.nombre
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .trim();

        return nombreRubroLimpio;
      }
    }
  } catch (err) {
    console.error("Excepción en interpretarBusqueda:", err);
  }

  // Si no encuentra coincidencia, devuelve el texto original
  return textoIngresado;
}
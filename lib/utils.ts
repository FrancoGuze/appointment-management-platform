import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const passwordHashing = (
  password: string,
  userUniqueCode: string,
  loops: number
): string => {

  const maxLength = 24

  // Genera un valor complementario basado en el código único del usuario
  // Promedia los char codes y divide entre 3 para obtener un desplazamiento base
  const complementaryVal = Math.round(
    userUniqueCode
      .split('')
      .map(char => char.charCodeAt(0) / userUniqueCode.length)
      .reduce((prev: number, curr: number) => prev + curr, 0) / 3
  )

  // Función de sustitución que respeta rangos de caracteres
  const shiftChar = (charCode: number, shift: number): number => {
    if (charCode >= 65 && charCode <= 90) {
      // Mayúsculas A-Z
      return ((charCode - 65 + shift) % 26) + 65
    }
    if (charCode >= 97 && charCode <= 122) {
      // Minúsculas a-z
      return ((charCode - 97 + shift) % 26) + 97
    }
    if (charCode >= 48 && charCode <= 57) {
      // Números 0-9
      return ((charCode - 48 + shift) % 10) + 48
    }
    // Símbolos y caracteres especiales (33-126) → se rotan dentro de su rango
    if (charCode >= 33 && charCode <= 126) {
      return ((charCode - 33 + shift) % 94) + 33
    }
    // Cualquier otra cosa (tildes, unicode, etc.) → intacto
    return charCode
  }

  // Función de expansión: si el hash es muy corto, lo extiende
  // combinando caracteres entre sí para alcanzar maxLength
  const expandHash = (input: string, targetLength: number): string => {
    if (input.length >= targetLength) return input
    let expanded = input
    let i = 0
    while (expanded.length < targetLength) {
      const a = expanded.charCodeAt(i % expanded.length)
      const b = expanded.charCodeAt((i + 1) % expanded.length)
      // XOR entre dos chars existentes genera un nuevo char dentro del rango visible
      const newChar = ((a ^ b) % 94) + 33
      expanded += String.fromCharCode(newChar)
      i++
    }
    return expanded.slice(0, targetLength)
  }

  let hash = expandHash(password, maxLength)

  for (let i = 1; i <= loops; i++) {
    // El shift varía en cada loop para que cada iteración sea diferente
    // Si siempre fuera el mismo, 10 loops sería lo mismo que 1 loop con shift * 10
    const loopShift = (complementaryVal + i * 7) % 26

    // Paso 1: sustitución — cada char se desplaza según loopShift
    const substituted = hash
      .split('')
      .map(char => String.fromCharCode(shiftChar(char.charCodeAt(0), loopShift)))
      .join('')

    // Paso 2: difusión — invertimos la mitad del string y lo intercalamos
    // Esto hace que un cambio en un char afecte a toda la cadena (efecto avalancha)
    const firstHalf = substituted.slice(0, maxLength / 2)
    const secondHalf = substituted.slice(maxLength / 2).split('').reverse().join('')

    const diffused = firstHalf
      .split('')
      .map((char, idx) => {
        const a = char.charCodeAt(0)
        const b = secondHalf.charCodeAt(idx) ?? a
        // XOR entre la primera y segunda mitad para mezclar ambas partes
        return String.fromCharCode(((a ^ b) % 94) + 33)
      })
      .join('')

    // Paso 3: expansión — si diffused quedó corto, se expande hasta maxLength
    hash = expandHash(diffused, maxLength)
  }

  return hash
}
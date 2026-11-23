import type { JourneyDetailKey } from './journeyDetails'

export const asset = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`

export const profile = {
  name: 'Alejandro Téllez Corona',
  firstName: 'Alejandro',
  lastName: 'Téllez Corona',
  role: 'Full Stack Developer & Cloud Architecture',
  location: 'Madrid, España',
  email: 'alejandro@tellezcorona.es',
  github: 'https://github.com/Alextc35',
  linkedin: 'https://www.linkedin.com/in/alejandrotellezcorona/',
  portrait: 'images/alejandro-tellez-corona.jpeg',
  handle: '@alextc35',
  copyrightYear: 2026,
}

export type JourneyCategory = 'education' | 'experience'
export type JourneyEntry = {
  id: JourneyDetailKey
  period: string
  title: string
  organization: string
  website?: string
  kind?: string
  description: string
  current?: boolean
  logo?: string
  logoShape?: 'wordmark'
}

export const journey: Record<JourneyCategory, JourneyEntry[]> = {
  education: [
    {
      id: 'tajamar',
      period: 'OCT 2026 — JUN 2027',
      title: 'Máster en Desarrollo Full Stack & Arquitecturas Cloud',
      organization: 'Tajamar · Madrid',
      website: 'https://www.tajamar.es/',
      description:
        'Formación práctica en aplicaciones web completas y soluciones cloud con Azure y AWS, mediante proyectos individuales y en equipo.',
      current: true,
      logo: 'images/tajamar-mark.svg',
    },
    {
      id: 'daw',
      period: 'SEP 2023 — JUN 2025',
      title: 'Desarrollo de Aplicaciones Web',
      organization: 'IES Luis Braille · Coslada',
      kind: 'Ciclo Formativo de Grado Superior',
      description:
        'Formación en desarrollo web, con una base que conecta interfaces, lógica de negocio y datos.',
      logo: 'images/luis-braille-mark.svg',
    },
    {
      id: 'smr',
      period: 'SEP 2021 — JUN 2023',
      title: 'Sistemas Microinformáticos y Redes',
      organization: 'IES Luis Braille · Coslada',
      kind: 'Ciclo Formativo de Grado Medio',
      description:
        'Mi punto de partida en informática: equipos, sistemas y redes. Una base práctica sobre la que seguir construyendo.',
      logo: 'images/luis-braille-mark.svg',
    },
  ],
  experience: [
    {
      id: 'freelance',
      period: 'MAR — JUN 2026',
      title: 'Desarrollador web e instructor de programación',
      organization: 'Autónomo',
      kind: 'Desarrollo & enseñanza',
      description:
        'Desarrollo de landing pages para empresas. Formación con Scratch para niños y clases de refuerzo de Python.',
    },
    {
      id: 'enova',
      period: 'MAR — JUN 2025',
      title: 'Desarrollador de aplicaciones',
      organization: 'Enova-IT Solutions',
      kind: 'Contrato de prácticas · Madrid',
      description:
        'Participé en el desarrollo de un TPV multiplataforma para una discoteca, con .NET MAUI y Blazor, Bootstrap, LINQ y Entity Framework.',
      logo: 'images/enova-it-logo.png',
      logoShape: 'wordmark',
    },
    {
      id: 'sanchez',
      period: 'MAR — JUN 2023',
      title: 'Técnico informático',
      organization: 'Sánchez Angulo, S. A.',
      kind: 'Contrato de prácticas · Coslada',
      description:
        'Soporte técnico, mantenimiento de equipos y administración básica de redes. Formateo y puesta a punto de ordenadores.',
      logo: 'images/sanchez-angulo-logo.png',
      logoShape: 'wordmark',
    },
  ],
}

export const currentEducation = journey.education.find((entry) => entry.current)!

export type ProjectPromo = {
  landscape: { src: string; poster: string; width: number; height: number }
  portrait: { src: string; poster: string; width: number; height: number }
  alt: string
  caption: string
}

export const portraitPromoMedia =
  '(max-width: 800px) and (orientation: portrait), (pointer: coarse) and (orientation: portrait)'

type Project = {
  id: string
  name: string
  category: string
  previewLabel: string
  previewFit: 'cover' | 'contain'
  summary: string
  description: string
  technologies: string[]
  features: { title: string; text: string }[]
  images: { src: string; alt: string; caption: string; width: number; height: number }[]
  promo?: ProjectPromo
  repository: string
  storeUrl: string | null
}

export const projects: Project[] = [
  {
    id: 'newdesktab',
    name: 'New DeskTab',
    category: 'EXTENSIÓN DE NAVEGADOR',
    previewLabel: 'newdesktab / tu espacio',
    previewFit: 'cover',
    summary: 'Tu nueva pestaña. Tu propio espacio.',
    description:
      'Un espacio visual para organizar tus favoritos, darles tu estilo y mantener a mano lo que abres cada día.',
    technologies: ['JavaScript', 'HTML & CSS', 'Manifest V3'],
    promo: {
      landscape: {
        src: 'videos/newdesktab-promo-1080p.mp4',
        poster: 'images/newdesktab-promo-poster.jpg',
        width: 1920,
        height: 1080,
      },
      portrait: {
        src: 'videos/newdesktab-promo-vertical.mp4',
        poster: 'images/newdesktab-promo-vertical-poster.jpg',
        width: 1080,
        height: 1920,
      },
      alt: 'Portada del vídeo promocional de New DeskTab con favoritos en un espacio personalizable',
      caption: 'Descubre New DeskTab en acción.',
    },
    features: [
      {
        title: 'Organiza a tu manera',
        text: 'Mueve y redimensiona tarjetas sobre una retícula flexible. Agrupa enlaces en carpetas y separa tus espacios de trabajo.',
      },
      {
        title: 'Hazlo tuyo',
        text: 'Personaliza colores, iconos, portadas y fondos. Navega con atajos de teclado y guarda tus estilos favoritos.',
      },
      {
        title: 'Tus datos, a tu ritmo',
        text: 'Almacenamiento local por defecto, copias de seguridad y Chrome Sync opcional. Sin cuenta propia de New DeskTab.',
      },
    ],
    images: [
      {
        src: 'images/newdesktab-workspace.png',
        alt: 'Captura real de New DeskTab con favoritos organizados en un espacio de trabajo',
        caption: 'Un lugar para lo que abres cada día.',
        width: 1280,
        height: 800,
      },
      {
        src: 'images/newdesktab-folder.png',
        alt: 'Captura real de una carpeta personalizable de New DeskTab',
        caption: 'Cada carpeta, a tu manera.',
        width: 1280,
        height: 800,
      },
    ],
    repository: 'https://github.com/Alextc35/newdesktab',
    storeUrl:
      'https://chromewebstore.google.com/detail/new-desktab/inafkeeciknpocbamagdmdnbbfmpdlmp',
  },
  {
    id: 'steam-card-api',
    name: 'Steam Card API',
    category: 'API REST',
    previewLabel: 'steam-card-api / tarjetas SVG',
    previewFit: 'contain',
    summary: 'Tu Steam, en una tarjeta.',
    description:
      'Una API que transforma datos públicos de Steam en tarjetas SVG y endpoints JSON para perfiles y juegos.',
    technologies: ['Java 21', 'Spring Boot', 'SVG'],
    features: [
      {
        title: 'Datos de Steam',
        text: 'Consulta perfiles, bibliotecas y juegos mediante endpoints JSON basados en datos públicos de Steam.',
      },
      {
        title: 'Tarjetas a tu estilo',
        text: 'Genera tarjetas SVG de perfil y de juegos con distintos diseños, temas, colores e imágenes integradas.',
      },
      {
        title: 'Integración y rendimiento',
        text: 'Pensada para READMEs y portfolios, con imágenes embebidas, caché Caffeine y despliegue con Docker.',
      },
    ],
    images: [
      {
        src: 'images/steam-card-hero.svg',
        alt: 'Tarjeta de perfil de Steam Card API con diseño Hero, tomada del repositorio original',
        caption: 'Tu actividad de Steam, a la vista.',
        width: 700,
        height: 270,
      },
      {
        src: 'images/steam-card-showcase.svg',
        alt: 'Tarjeta de Steam Card API con diseño Showcase oscuro, tomada del repositorio original',
        caption: 'Distintos diseños, el mismo perfil.',
        width: 700,
        height: 300,
      },
    ],
    repository: 'https://github.com/Alextc35/steam-card-api',
    storeUrl: null,
  },
]

export type DetailSection = { title: string; items: string[] }
export type JourneyDetail = {
  summary: string
  sections: DetailSection[]
  technologies: string[]
  location?: string
}
export type JourneyDetailKey = 'tajamar' | 'daw' | 'smr' | 'freelance' | 'enova' | 'sanchez'

// Contenido sintetizado de los apuntes y las capturas aportados por Alejandro.
// Las áreas de formación se describen como aprendizaje, sin atribuir certificaciones.
export const journeyDetails: Record<JourneyDetailKey, JourneyDetail> = {
  tajamar: {
    summary:
      'Actualmente curso el Máster en Desarrollo Full Stack & Arquitecturas Cloud en Tajamar, Madrid. Una etapa para seguir conectando el desarrollo de aplicaciones completas, los sistemas y la automatización.',
    sections: [
      {
        title: 'Desarrollo Full Stack',
        items: [
          'Profundización en la construcción de aplicaciones completas, desde la interfaz hasta la lógica de negocio y los datos.',
          'Desarrollo web con HTML, CSS, JavaScript, Bootstrap y Angular.',
          'Continuidad del aprendizaje mediante proyectos propios y práctica de desarrollo.',
        ],
      },
      {
        title: 'Cloud y automatización',
        items: [
          'Formación en arquitecturas Cloud y en la organización de los servicios que hacen posible una aplicación.',
          'Aprendizaje de Power Platform, Power Automate, Power Apps y SharePoint.',
        ],
      },
    ],
    technologies: [
      'HTML',
      'CSS',
      'JavaScript',
      'Bootstrap',
      'Angular',
      'Full Stack',
      'Arquitecturas Cloud',
      'Power Platform',
      'Power Automate',
      'Power Apps',
      'SharePoint',
    ],
    location: 'Tajamar, Madrid',
  },
  daw: {
    summary:
      'Grado Superior en Desarrollo de Aplicaciones Web en IES Luis Braille. Formación en programación, bases de datos, interfaces, desarrollo en cliente y servidor, y despliegue de aplicaciones.',
    sections: [
      {
        title: '1º · Sistemas informáticos',
        items: [
          'Arquitectura de equipos, instalación y configuración de sistemas operativos en servidores y puestos de trabajo.',
          'Administración de usuarios, permisos y recursos; seguridad, automatización de tareas y configuración básica de redes.',
        ],
      },
      {
        title: '1º · Bases de datos',
        items: [
          'Diseño relacional, normalización, tablas y relaciones; consultas y operaciones de datos mediante SQL.',
          'Trabajo con Oracle Database 18c y SQL Developer; funciones, procedimientos y triggers con PL/SQL.',
        ],
      },
      {
        title: '1º · Programación',
        items: [
          'Fundamentos de programación con Python y programación orientada a objetos con Java: clases, objetos, herencia y polimorfismo.',
          'Uso de Spyder y NetBeans; exploración adicional de Pandas y NumPy para trabajar con datos en Python.',
        ],
      },
      {
        title: '1º · Lenguajes de marcas',
        items: [
          'Maquetación de páginas con HTML5 y CSS3; estructura e intercambio de información con XML.',
          'Definición y transformación de documentos mediante DTD, XSD y XSL, usando Visual Studio Code y XML Copy Editor.',
        ],
      },
      {
        title: '1º · Entornos de desarrollo',
        items: [
          'Configuración de Eclipse y uso de sus herramientas de depuración para localizar y corregir errores.',
          'Organización del trabajo con Scrum y representación del diseño de software mediante UML.',
        ],
      },
      {
        title: '2º · Desarrollo web en entorno cliente',
        items: [
          'JavaScript y programación orientada a objetos en el navegador.',
          'Eventos, manipulación del DOM, validaciones e interfaces dinámicas.',
        ],
      },
      {
        title: '2º · Desarrollo web en entorno servidor',
        items: [
          'Aplicaciones dinámicas con PHP en XAMPP y operaciones CRUD conectadas a bases de datos.',
          'Acceso a datos con PDO y patrón DAO; organización de aplicaciones con MVC.',
          'Introducción al uso de tokens para sesiones y seguridad en aplicaciones web.',
        ],
      },
      {
        title: '2º · Despliegue de aplicaciones web',
        items: [
          'VirtualBox y Ubuntu para preparar entornos de servidor, redes y servicios HTTP, DNS y FTP.',
          'Configuración y diferencias entre servidores web y de aplicaciones, con Apache y Tomcat.',
          'Introducción a Docker y documentación de proyectos Java mediante Javadoc.',
        ],
      },
      {
        title: '2º · Diseño de interfaces web',
        items: [
          'Planificación de interfaces centradas en UX/UI y uso de CSS con Flexbox, Grid, media queries, keyframes, animaciones y efectos 3D.',
          'Práctica con Bootstrap y Sass/SCSS para organizar y reutilizar estilos.',
          'Aplicación de conceptos de color, imagen, audio y vídeo al diseño web.',
        ],
      },
      {
        title: '2º · Inglés técnico',
        items: [
          'Lectura, interpretación y redacción de documentación sobre desarrollo web, redes y sistemas.',
          'Uso de recursos internacionales y comunicación en situaciones profesionales, entrevistas y soporte técnico.',
        ],
      },
      {
        title: 'Formación en centros de trabajo',
        items: [
          'Prácticas en Enova-IT Solutions: participación en un TPV con .NET MAUI y Blazor, análisis de código existente, corrección de errores y pruebas funcionales.',
          'Desarrollo del panel de administración web con CakePHP y MVC para gestionar productos, escandallos, locales y otros recursos.',
        ],
      },
    ],
    technologies: [
      'Python',
      'Java',
      'SQL',
      'Oracle Database',
      'PL/SQL',
      'HTML & CSS',
      'JavaScript',
      'XML',
      'PHP',
      'PDO',
      'MVC',
      'Bootstrap',
      'Sass/SCSS',
      'Docker',
    ],
    location: 'IES Luis Braille, Coslada',
  },
  smr: {
    summary:
      'Grado Medio en Sistemas Microinformáticos y Redes en IES Luis Braille. Mi base en montaje de equipos, sistemas operativos, redes, servicios y seguridad informática.',
    sections: [
      {
        title: '1º · Montaje y mantenimiento de equipos',
        items: [
          'Identificación de componentes, montaje y configuración de ordenadores, actualización de hardware y sustitución de piezas.',
          'Mantenimiento preventivo y correctivo, instalación de sistemas operativos y configuración de controladores.',
        ],
      },
      {
        title: '1º · Sistemas operativos monopuestos',
        items: [
          'Instalación y configuración de Windows y Linux, particiones, discos y sistemas de archivos.',
          'Gestión de usuarios, permisos y parámetros del sistema según las necesidades del equipo.',
        ],
      },
      {
        title: '1º · Aplicaciones ofimáticas',
        items: [
          'Documentos, hojas de cálculo con funciones y gráficos, y presentaciones con PowerPoint.',
          'Integración de aplicaciones ofimáticas para organizar información y elaborar proyectos.',
        ],
      },
      {
        title: '1º · Redes locales',
        items: [
          'Topologías, medios de transmisión y fundamentos de redes LAN y WAN.',
          'Instalación y configuración de routers y switches, y asignación y gestión de direcciones IP.',
        ],
      },
      {
        title: '1º · Formación y orientación laboral',
        items: [
          'Contratos, derechos laborales y prevención de riesgos en el trabajo.',
          'Búsqueda de empleo, preparación de currículums y entrevistas, comunicación y trabajo en equipo.',
        ],
      },
      {
        title: '2º · Sistemas operativos en red',
        items: [
          'Instalación y administración de Windows Server y Linux en modo servidor, incluyendo Active Directory.',
          'Gestión de usuarios y permisos, virtualización, políticas de seguridad y supervisión de servicios.',
        ],
      },
      {
        title: '2º · Seguridad informática',
        items: [
          'Identificación de vulnerabilidades y riesgos, protección de datos y buenas prácticas de seguridad.',
          'Copias de seguridad y recuperación de información ante incidentes.',
        ],
      },
      {
        title: '2º · Servicios en red',
        items: [
          'Instalación y configuración de servidores web, correo electrónico y recursos compartidos.',
          'Resolución de incidencias y aplicación de medidas de seguridad en servicios de red.',
        ],
      },
      {
        title: '2º · Aplicaciones web',
        items: [
          'Creación de sitios estáticos y aplicaciones web básicas con HTML y CSS.',
          'Fundamentos del funcionamiento de las aplicaciones web y la arquitectura cliente-servidor.',
        ],
      },
      {
        title: '2º · Inglés técnico',
        items: [
          'Comprensión de manuales, documentación, guías de instalación y tutoriales sobre sistemas, redes y seguridad.',
          'Vocabulario y comunicación para situaciones de soporte técnico y gestión de redes.',
        ],
      },
      {
        title: '2º · Empresa e iniciativa emprendedora',
        items: [
          'Preparación de planes de negocio y estudio de su viabilidad, organización y aspectos financieros.',
          'Introducción a normativa legal y fiscal, recursos humanos, marketing y gestión de recursos.',
        ],
      },
      {
        title: 'Formación en centros de trabajo',
        items: [
          'Prácticas en Sánchez Angulo: soporte y mantenimiento de equipos, integración en redes corporativas y participación en instalaciones de seguridad junto al ingeniero que me mentorizaba.',
        ],
      },
    ],
    technologies: [
      'Hardware',
      'Windows',
      'Linux',
      'Windows Server',
      'Active Directory',
      'Redes locales',
      'Ofimática',
      'HTML & CSS',
      'pfSense',
      'Supremo',
    ],
    location: 'IES Luis Braille, Coslada',
  },
  freelance: {
    summary:
      'Desarrollo de landing pages para empresas y enseñanza de programación, combinando proyectos web con formación adaptada a distintos niveles.',
    sections: [
      {
        title: 'Desarrollo web',
        items: [
          'Creación de landing pages para empresas con el objetivo de mejorar su presencia online.',
        ],
      },
      {
        title: 'Enseñanza de programación',
        items: [
          'Formación con Scratch dirigida a niños.',
          'Clases de refuerzo de Python para estudiantes de primer curso universitario.',
        ],
      },
    ],
    technologies: ['Landing pages', 'Scratch', 'Python', 'Enseñanza'],
  },
  enova: {
    summary:
      'Prácticas de DAW en el desarrollo de un TPV multiplataforma y de su panel de administración web, colaborando en funcionalidades, mantenimiento y pruebas.',
    sections: [
      {
        title: 'TPV multiplataforma',
        items: [
          'Participación en una aplicación para una discoteca creada con .NET MAUI, Blazor y Bootstrap, utilizando C#, LINQ y Entity Framework.',
          'Colaboración en funcionalidades de gestión de ventas y operaciones del local.',
        ],
      },
      {
        title: 'Administración web',
        items: [
          'Desarrollo del panel del TPV con CakePHP bajo el patrón MVC y jQuery.',
          'Gestión de productos, escandallos, locales y configuraciones internas del sistema.',
        ],
      },
      {
        title: 'Mantenimiento y validación',
        items: [
          'Análisis de código existente, corrección de errores y pruebas funcionales manuales.',
          'Colaboración con otros desarrolladores y uso de Git para el seguimiento de cambios.',
        ],
      },
    ],
    technologies: [
      '.NET MAUI',
      'Blazor',
      'C#',
      'Bootstrap',
      'LINQ',
      'Entity Framework',
      'CakePHP',
      'MVC',
      'jQuery',
      'Git',
    ],
    location: 'San Sebastián de los Reyes, Madrid · Presencial',
  },
  sanchez: {
    summary:
      'Prácticas de SMR centradas en soporte técnico, mantenimiento de equipos y administración básica de redes en entornos empresariales.',
    sections: [
      {
        title: 'Equipos y soporte',
        items: [
          'Formateo y puesta a punto de portátiles y ordenadores de sobremesa, instalación de software y resolución de incidencias.',
          'Diagnóstico de problemas de rendimiento y sustitución de hardware, incluidos discos duros.',
        ],
      },
      {
        title: 'Redes y seguridad',
        items: [
          'Integración de equipos en dominios corporativos y configuración del acceso a recursos compartidos.',
          'Participación en la instalación y puesta en marcha de firewalls pfSense junto al ingeniero que me mentorizaba.',
          'Instalación de antivirus y aplicación de medidas de seguridad y políticas de acceso.',
        ],
      },
      {
        title: 'Soporte remoto',
        items: ['Resolución de incidencias a distancia mediante Supremo.'],
      },
    ],
    technologies: [
      'Soporte técnico',
      'Hardware',
      'Redes',
      'Dominios corporativos',
      'pfSense',
      'Supremo',
      'Antivirus',
    ],
    location: 'Coslada, Madrid · Presencial',
  },
}

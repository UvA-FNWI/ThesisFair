import apiGen from './api/api.js'

const api = apiGen(`${window.location.protocol}//${window.location.host}/api/`)
export default api.api

async function download(content, filename) {
  const a = document.createElement('a')
  const blob = await (await fetch(content)).blob()
  const url = URL.createObjectURL(blob)
  a.setAttribute('href', url)
  a.setAttribute('download', filename)
  a.click()
  a.remove()
}

export const downloadCV = async (uid, name = 'cv') => {
  const cv = await api.api.user.student.getCV(uid).exec()
  if (!cv) {
    alert('No CV has been uploaded')
    return
  }

  download(cv, name + '.pdf')
}

export const getFileContent = (text = false) => {
  return new Promise(resolve => {
    const input = document.createElement('input')
    input.type = 'file'
    input.onchange = async () => {
      const blob = input.files.item(0)
      if (!blob) {
        input.remove()
        resolve(null)
        return
      }

      const reader = new FileReader()
      reader.onloadend = async () => {
        input.remove()
        resolve(reader.result)
      }

      if (text) {
        reader.readAsText(blob)
      } else {
        reader.readAsDataURL(blob)
      }
    }
    input.click()
  })
}

export const degrees = {
  'AI': 'MSc Artificial Intelligence',
  'CPS': 'MSc Computational Science',
  // 'CS': 'MSc Computer Science',
  'DS': 'MSc Information Studies (Data Science track)',
  'IS': 'MSc Information Studies (Information Systems track)',
  'MoL': 'MSc Logic',
  'SE': 'MSc Software Engineering',
}

export const tags = {
  'Amsterdam Machine Learning Lab': [
    'Probabilistic Modeling and Bayesian Machine Learning',
    'Geometric Deep Learning',
    'Reinforcement Learning',
    'Causality',
    'Probabilistic Programming',
  ],
  'Computational Science Lab': [
    'Modelling complex systems & networks',
    'Modelling natural phenomena',
    'Agent-based models',
    'Uncertainty quantification',
    'Numerical methods and algorithms',
    'High-performance computing',
    'Scientific Visualization and Virtual Reality',
  ],
  'Computer Vision': [
    '3D image understanding',
    '3D facial analysis',
    '3D scene reconstruction',
    'Geometric algebra',
    'Simultaneous localization and mapping',
  ],
  'Digital Interactions Lab': [
    'Interaction Design',
    'Smart Technologies/Environments for Learning',
    'Digital Technologies for Health and Wellbeing',
    'Human Building Interaction',
  ],
  'Intelligent Data Engineering Lab': [
    'Data integration',
    'Data management for machine learning',
    'Causality and machine learning',
    'Information extraction (NLP)',
    'Knowledge graphs',
  ],
  'Information Retrieval Lab': [
    'Information retrieval',
    'Search engines',
    'Recommender systems',
    'Conversational assistants',
    'Knowledge extraction',
  ],
  'Language Technology Lab': [
    'Natural language processing',
    'Multilingual NLP',
    'Deep learning for NLP',
    'Natural language generation',
    'Structure prediction',
  ],
  'Multimedia Analytics Lab Amsterdam': [
    'Multimedia Analysis',
    'Multimedia Fusion',
    'Visual Analytics',
    'Cultural Heritage',
    'Forensics',
  ],
  'Quantitative Healthcare Analysis': [
    'AI & Health',
    'Medical image analysis',
    'Medical signal processing',
  ],
  'Theory of Computer Science': [
    'Algorithms and datastructures',
    'Complexity theory',
    'Quantum computing',
    'Model checking',
  ],
  'Complex Cyber Infrastructure': [
    'Responsible computing',
    'Normative and policy-based infrastructures',
    'Domain-specific software languages',
    'Data exchange systems',
    'Software (micro-)services automatic composition/decomposition',
    'Digitalization of education',
  ],
  'Security by Design': [
    'Design Automation for Security',
    'Hardware security',
    'Machine learning Security',
    'Cryptography',
    'Physical attacks',
    'Security of RISC-V',
  ],
  'Multiscale Networked Systems': [
    'Programmable network',
    'Quantum computing',
    'HPC and Cloud',
    'Blockchain',
    'Big Data management',
  ],
  'Parallel Computing Systems': [
    'Modelling, analysis and optimization of extra-functional system properties (performance, energy-consumption, reliability, etc.)',
    'Performance engineering',
    'Computer language design and compiler frameworks',
    'Run-time system resource management',
    'Deep-learning (inference) at the edge',
  ],
  'Socially Intelligent Artificial Systems': [
    'Fairness, Accountability, and Transparency in AI',
    'Responsible, Explainable and Socially-aware AI',
    'Social Data Science, Inclusive AI, Cooperation and Fairness in Hybrid Populations',
    'Algorithmic Social Justice, Algorithms and Social Dynamics',
    'AI Ethics, Governance, and Democracy',
  ],
  'Video and Image Sense Lab': [
    'Video and image understanding',
    'Spatiotemporal recognition, retrieval and tracking',
    'Temporal visual learning and dynamics',
    'Visual learning with prior knowledge',
    'Efficient computer vision',
    'Human visual perception and computational neuroimaging',
    'Few-shot learning / meta learning / out-of-distribution learning',
    'Self-supervised learning',
    'Visual bias and fairness',
  ],
  'Natural Language Processing & Digital Humanities': [
    'Natural language processing',
    'Machine learning for natural language processing',
    'Computational Linguistics',
    'Computational Arts & Humanities',
    'Explainable AI',
  ],
  'Theoretical Computer Science (ILLC)': [
    'Algorithms and Complexity',
    'Automated Planning',
    'Knowledge Representation',
    'Multiagent Systems',
    'Algorithmic Game Theory',
    'Computational Social Choice',
  ],
  'Formal Semantics and Philosophical Logic': [
    'Causal inference and common sense reasoning',
    'Computational models of language and cognition',
    'Responsible AI',
    'Sign language technolog',
  ],
}

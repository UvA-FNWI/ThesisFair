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

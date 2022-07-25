import apiGen from './api/api.js';

const api = apiGen(process.env.REACT_APP_API_ENDPOINT);
export default api.api;


async function download(content, filename) {
  const a = document.createElement('a');
  const blob = await (await fetch(content)).blob();
  const url = URL.createObjectURL(blob);
  a.setAttribute('href', url);
  a.setAttribute('download', filename);
  a.click();
  a.remove()
}

export const downloadCV = async (uid, name='cv') => {
  const cv = await api.api.user.student.getCV(uid).exec();
  if (!cv) {
    alert('No CV has been uploaded');
    return;
  }

  download(cv, name + '.pdf');
}

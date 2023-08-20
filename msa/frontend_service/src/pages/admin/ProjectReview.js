import React from 'react'

import { useParams } from 'react-router-dom'
import ProjectReview from '../../components/projectReview/projectReview'

function close() {
  window.location.href = '/projects'
}

function ProjectEditorPage(props) {
  const params = useParams()

  return <ProjectReview onClose={close} params={{ ...props, ...params }} />
}

export default ProjectEditorPage

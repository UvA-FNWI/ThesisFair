import React from 'react'

import { useParams } from 'react-router-dom'
import EventEditor from '../../components/eventEditor/eventEditor'

function close() {
  window.location.href = 'event'
}

function ProjectEditorPage(props) {
  const params = useParams()

  return <EventEditor onClose={close} params={{ ...props, ...params }} />
}

export default ProjectEditorPage

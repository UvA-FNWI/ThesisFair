import React from 'react'
import { Button, Container, OverlayTrigger, Tooltip } from 'react-bootstrap'
// import downloadIcon from 'bootstrap-icons/icons/download.svg'
import { useParams } from 'react-router-dom'

import ProjectEditor from '../../components/projectEditor/projectEditor'

import './projects.scss'
import '../../components/projectListItem/projectListItem.scss'

function ProjectsWithParams(props) {
  const params = useParams()

  return <ProjectEditor onClose={props.onClose} params={params} />
}

export default ProjectsWithParams

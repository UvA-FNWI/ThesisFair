import React from 'react'

// import { useParams } from "react-router-dom";

import ProjectListItem from '../projectListItem/projectListItem'

import './projectList.scss'
// import api from "../../api";

function ProjectList(props) {
  // const params = useParams();
  // const type = api.getApiTokenData().type;

  return (
    <div className='list--red-border'>
      <div className='list' style={{ maxHeight: props.maxHeight }}>
        {/* Map to project and index */}
        {props.projects.map((project, index) => (
          <ProjectListItem key={index} selected={props.selected} hidden={props.hidden} project={project} />
        ))}
      </div>
    </div>
  )
}

export default ProjectList

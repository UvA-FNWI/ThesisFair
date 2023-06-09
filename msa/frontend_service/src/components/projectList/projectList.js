import React from 'react'

// import { useParams } from "react-router-dom";

import RegistrationListItem from '../projectListItem/projectListItem'

import './projectList.scss'
// import api from "../../api";

function RegistrationList(props) {
  // const params = useParams();
  // const type = api.getApiTokenData().type;

  return (
    <div className='list--red-border'>
      <div className='list' style={{ maxHeight: props.maxHeight }}>
        {/* Map to project and index */}
        {props.projects.map((project, index) => (
          <RegistrationListItem key={index} selected={props.selected} hidden={props.hidden} project={project} />
        ))}
      </div>
    </div>
  )
}

export default RegistrationList

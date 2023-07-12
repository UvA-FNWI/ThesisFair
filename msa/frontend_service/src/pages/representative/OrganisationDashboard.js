import React from 'react'

import api from '../../api'
import * as session from '../../session'
import EntityEditor from '../../components/entityEditor/entityEditor'
import { useParams } from 'react-router-dom'

class OrganisationDashboard extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      enid: props.params.enid,
    }
  }

  render() {
    if (this.state.enid) return <EntityEditor enid={this.state.enid} />

    if (api.getApiTokenData().type === 'r') return <EntityEditor enid={session.getEnid()} />

    return <EntityEditor />
  }
}

function OrganisationDashboardWithParams(props) {
  const params = useParams()

  return <OrganisationDashboard {...props} params={params} />
}

export default OrganisationDashboardWithParams

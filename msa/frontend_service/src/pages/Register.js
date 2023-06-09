import React from 'react'
import ProjectList from '../components/projectList/projectList'

import api from '../api'
import './register.scss'

class Register extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      event: {},
      schedule: [],
    }
  }

  async componentDidMount() {
    const [event, schedule] = await Promise.all([
      api.event.get(this.props.params.evid).exec(),
      api.schedule.student.get(api.getApiTokenData().uid, this.props.params.evid).exec(),
    ])
    if (!schedule) {
      this.setState({ event, schedule })
      return
    }

    const entities = await api.entity
      .getMultiple(
        schedule.map(s => s.enid),
        { enid: true, name: true, location: true }
      )
      .exec()
    for (const appointment of schedule) {
      const entity = entities.find(entity => entity.enid === appointment.enid)
      if (!entity) {
        console.error(`Could not find entity with enid ${appointment.enid}`)
        continue
      }

      appointment.entityName = entity.name
      appointment.entityLocation = entity.location
    }

    schedule.sort((a, b) => (a.slot > b.slot ? 1 : -1))
    this.setState({ event, schedule })
  }

  data = [
    {
      selected: true,
      project: {
        name: 'Topic 1',
        email: 'abc@example.com',
        tags: [
          {
            fullTag: 'AI',
            abbreviation: 'AI',
          },
          {
            fullTag: 'SE',
            abbreviation: 'SE',
          },
        ],
        description: 'This is a description',
      },
    },
    {
      selected: true,
      project: {
        name: 'Topic 8',
        email: 'abc@example.com',
        tags: [
          {
            fullTag: 'AI',
            abbreviation: 'AI',
          },
          {
            fullTag: 'SE',
            abbreviation: 'SE',
          },
        ],
        description: 'This is a description',
      },
    },
    {
      selected: true,
      project: {
        name: 'Topic 5',
        email: 'abc@example.com',
        tags: [
          {
            fullTag: 'AI',
            abbreviation: 'AI',
          },
          {
            fullTag: 'SE',
            abbreviation: 'SE',
          },
        ],
        description: 'This is a description',
      },
    },
    {
      selected: false,
      project: {
        name: 'Topic 2',
        email: 'def@example.com',
        tags: [
          {
            fullTag: 'AI',
            abbreviation: 'AI',
          },
          {
            fullTag: 'SE',
            abbreviation: 'SE',
          },
        ],
        description: 'This is a description',
      },
    },
    {
      selected: false,
      project: {
        name: 'Topic 5',
        email: 'def@example.com',
        tags: [
          {
            fullTag: 'AI',
            abbreviation: 'AI',
          },
          {
            fullTag: 'SE',
            abbreviation: 'SE',
          },
        ],
        description: 'This is a description',
      },
    },
    {
      selected: false,
      hidden: true,
      project: {
        name: 'Topic 6',
        email: 'def@example.com',
        tags: [
          {
            fullTag: 'AI',
            abbreviation: 'AI',
          },
          {
            fullTag: 'SE',
            abbreviation: 'SE',
          },
        ],
        description: 'This is a description',
      },
    },
  ]

  dataSelected = this.data.filter(project => project.selected).map(project => project.project)

  dataUnselected = this.data.filter(project => !project.selected && !project.hidden).map(project => project.project)

  dataHidden = this.data.filter(project => project.hidden && !project.selected).map(project => project.project)

  render() {
    return (
      <div className='page'>
        <div className='page__list page__list--left'>
          <div className='page__list page__list--unregistered'>
            <ProjectList selected={false} projects={this.dataUnselected} />
          </div>
          <div className='page__list page__list--hidden'>
            <ProjectList maxHeight='15rem' selected={false} hidden={true} projects={this.dataHidden} />
          </div>
        </div>
        <div className='page__list page__list--right'>
          <div className='page__list page__list--registered'>
            <ProjectList selected={true} projects={this.dataSelected} />
          </div>
        </div>
      </div>
    )
  }
}

export default Register

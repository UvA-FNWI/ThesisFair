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

  button_sets = project => ({
    student: {
      unselected: [
        {
          label: 'Hide',
          colour: 'red',
          onClick: () => this.hideProject(project),
        },
        {
          label: 'Add',
          colour: 'green',
          onClick: () => this.addProject(project),
        },
      ],
      selected: [
        {
          label: 'Remove',
          colour: 'red',
          onClick: () => this.removeProject(project),
        },
      ],
      hidden: [
        {
          label: 'Unhide',
          colour: 'blue',
          onClick: () => this.unhideProject(project),
        },
        {
          label: 'Add',
          colour: 'green',
          onClick: () => this.addProject(project),
        },
      ],
    },
    admin: {
      unapproved: [
        {
          label: 'Disapprove',
          colour: 'red',
          onClick: () => this.disapproveProject(project),
        },
        {
          label: 'Approve',
          colour: 'green',
          onClick: () => this.approveProject(project),
        },
      ],
      approved: [
        {
          label: 'Disapprove',
          colour: 'red',
          onClick: () => this.disapproveProject(project),
        },
      ],
      disapproved: [],
    },
    representative: {
      default: {
        label: 'Edit',
        colour: 'blue',
        onClick: () => this.editProject(project),
      },
    },
  })

  data = [
    {
      selected: true,
      project: {
        name: 'Topic 1',
        email: 'abc@example.com',
        tags: ['AI', 'SE', 'CS', 'Custom Tag', 'Magic'],
        description: '### This is a description',
        buttons: this.button_sets(null).student.selected,
      },
    },
    {
      selected: true,
      project: {
        name: 'Topic 8',
        email: 'abc@example.com',
        tags: ['AI', 'SE', 'CS', 'Custom Tag', 'Magic'],
        description: 'This is a description',
        buttons: this.button_sets(null).student.selected,
      },
    },
    {
      selected: true,
      project: {
        name: 'Computer Science Project',
        email: 'standard@example.com',
        tags: ['CPS', 'CS', 'Custom Tag', 'Magic'],
        description: '# This is a sample project\n\nIt is hardcoded for testing',
        buttons: this.button_sets(null).student.selected,
      },
    },
    {
      selected: false,
      project: {
        name: 'Thesis Fair Update',
        email: 'contact@thesisfair.uva.nl',
        tags: ['SE', 'CS', 'Example Tag 1', 'Another Tag'],
        description: '# This is Markdown\n\nThis is the description of the project',
        buttons: this.button_sets(null).student.unselected,
      },
    },
    {
      selected: false,
      project: {
        name: 'Topic 5',
        email: 'def@example.com',
        tags: ['AI', 'SE', 'CS', 'Currently not', 'Selected'],
        description: 'This is a description',
        buttons: this.button_sets(null).student.unselected,
      },
    },
    {
      selected: false,
      hidden: true,
      project: {
        name: 'Topic 6',
        email: 'def@example.com',
        tags: ['AI', 'SE', 'CS', 'Custom Tag', 'Magic'],
        description: 'This is a description',
        buttons: this.button_sets(null).student.hidden,
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

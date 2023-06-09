import React from 'react'
import ProjectList from '../components/projectList/projectList'

import './testing.scss'

class Testing extends React.Component {
  constructor(props) {
    super(props)
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

  dataUnselected = this.data.filter(project => !project.selected).map(project => project.project)

  render() {
    return (
      <div className='page'>
        <div className='page__content'>
          <ProjectList selected={true} projects={this.dataSelected} />

          <ProjectList selected={false} projects={this.dataUnselected} />
        </div>
      </div>
    )
  }
}

export default Testing

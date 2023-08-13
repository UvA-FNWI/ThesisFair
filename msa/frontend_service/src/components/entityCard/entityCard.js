import React from 'react'
import MDEditor from '@uiw/react-md-editor'
import rehypeSanitize from 'rehype-sanitize'
import { Card, Button } from 'react-bootstrap'
import { Link } from 'react-router-dom'

import cl from 'clsx'

import api from '../../api'
import graphqlFields from '../../api/graphqlFields'
import Tag from '../tag/tag'

import './entityCard.scss'

class EntityCard extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      ...Object.fromEntries(graphqlFields['Entity'].map(f => [f, null])),
      isAdmin: props.isAdmin,
    }
  }

  async componentDidMount() {
    const entity = this.props.enid ? await api.entity.get(this.props.enid).exec() : {}

    this.setState({
      ...entity,
      ...this.props.entity,
    })
  }

  render() {
    const contactEmail = this.state.contact && this.state.contact.find(c => c.type === 'email')

    return (
      <Card data-color-mode='light' className={cl('entity-card', { 'entity-card--no-image': !this.state.image })}>
        <Card.Img className='entity-card__image' variant='top' src={this.state.image} />
        <Card.Body className='d-flex flex-column'>
          <Card.Title>{this.state.name}</Card.Title>
          <Card.Subtitle className='entity-card__subtitle'>
            <small className='text-muted'>{contactEmail && contactEmail.content}</small>
          </Card.Subtitle>
          <Card.Text className='entity-card__body'>
            {this.state.isAdmin && (
              <div className='entity-card__tags'>
                <Tag
                  key='type'
                  label={`Type: ${this.state.type || 'unknown'}`}
                  tooltip={`type: ${this.state.type}`}
                  selectable={false}
                />
                <Tag
                  key='payment'
                  label={'Payment: incomplete'}
                  tooltip={'This organization has yet to pay'}
                  selectable={false}
                />
              </div>
            )}

            <MDEditor.Markdown
              source={this.state.description}
              previewOptions={{
                rehypePlugins: [[rehypeSanitize]],
              }}
            />
          </Card.Text>
          {this.state.isAdmin && (
            <div className='mt-auto'>
              <Link to={`/organisation/${this.state.enid}/edit/`}>
                <Button variant='primary'>Edit</Button>
              </Link>{' '}
            </div>
          )}
        </Card.Body>
      </Card>
    )
  }
}

export default EntityCard

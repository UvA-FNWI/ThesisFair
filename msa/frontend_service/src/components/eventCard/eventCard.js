import React from 'react'
import MDEditor from '@uiw/react-md-editor'
import rehypeSanitize from 'rehype-sanitize'
import { Card, Button } from 'react-bootstrap'
import { Link } from 'react-router-dom'

import cl from 'clsx'

import api from '../../api'
import graphqlFields from '../../api/graphqlFields'
import Tag from '../tag/tag'

import './eventCard.scss'

import { degreeById } from '../../definitions'

class EventCard extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      ...Object.fromEntries(graphqlFields['Event'].map(f => [f, null])),
      image: null,
    }

    this.state = {
      ...this.state,
      degrees: ['MScAI', 'MScISDS', 'MScLogic'],
    }
  }

  async componentDidMount() {
    const event = await api.event.get(this.props.evid).exec()
    const image = await api.event
      .getImage(this.props.evid, api.getApiTokenData().type === 's' ? 'student' : 'rep')
      .exec()

    this.setState({ ...event, image })
  }

  render() {
    return (
      <Card data-color-mode='light' className={cl('card', { 'card--no-image': !this.state.image })}>
        <Card.Img className='card__image' variant='top' src={this.state.image} />
        <Card.Body className='d-flex flex-column'>
          <Card.Title>{this.state.name}</Card.Title>
          <Card.Subtitle className='card__subtitle'>
            <small className='text-muted'>
              <time dateTime={this.state.start}>{new Date(this.state.start).toLocaleDateString('NL-nl')}</time>
              ,&ensp;
              <time dateTime={this.state.start}>
                {new Date(this.state.start).toLocaleTimeString('NL-nl', { hour: '2-digit', minute: '2-digit' })}
              </time>
              &ensp;&mdash;&ensp;
              <time dateTime={this.state.end}>
                {new Date(this.state.end).toLocaleTimeString('NL-nl', { hour: '2-digit', minute: '2-digit' })}
              </time>
            </small>
          </Card.Subtitle>
          <Card.Text className='card__body'>
            <div className='card__tags'>
              {this.state.degrees !== null &&
                this.state.degrees.length > 0 &&
                this.state.degrees.map(tagId => {
                  const tag = degreeById[tagId]

                  return <Tag key={tag.id} label={tag.tag} tooltip={tag.tooltip} selectable={false} />
                })}
            </div>

            <MDEditor.Markdown
              source={this.state.description}
              previewOptions={{
                rehypePlugins: [[rehypeSanitize]],
              }}
            />
          </Card.Text>
          {api.getApiTokenData().type !== 'a' &&
            <Link className='mt-auto' to={`event/${this.state.evid}/`}>
              <Button variant='primary'>More info</Button>
            </Link>
          }
          {api.getApiTokenData().type === 'a' && <div className='mt-auto'>
            <Link to={`event/${this.state.evid}/`}>
              <Button variant='primary'>View</Button>
            </Link>{' '}
            <Link to={`event/${this.state.evid}/edit`}>
              <Button variant='primary'>Edit</Button>
            </Link>
          </div>}
        </Card.Body>
      </Card>
    )
  }
}

export default EventCard

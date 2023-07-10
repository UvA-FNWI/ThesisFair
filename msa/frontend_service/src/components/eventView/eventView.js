import React from 'react'
import MDEditor from '@uiw/react-md-editor'
import rehypeSanitize from 'rehype-sanitize'
import { Container } from 'react-bootstrap'

import api from '../../api'
import graphqlFields from '../../api/graphqlFields'
import Tag from '../tag/tag'

import './eventView.scss'

import { degreeById } from '../../definitions'

class EventView extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      ...Object.fromEntries(graphqlFields['Event'].map(f => [f, null])),
      image: null,
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
      <Container className='event-view' data-color-mode='light'>
        {this.state.image && <img className='event-view__image' src={this.state.image} alt='' />}
        <h1>{this.state.name}</h1>

        <div className='event-view__divider event-view__divider--less-spacing'>
          <p className='event-view__section-header'>Date</p>
        </div>

        <p className='event-view__date'>
          <time dateTime={this.state.start}>{new Date(this.state.start).toLocaleDateString('NL-nl')}</time>
          ,&ensp;
          <time dateTime={this.state.start}>
            {new Date(this.state.start).toLocaleTimeString('NL-nl', { hour: '2-digit', minute: '2-digit' })}
          </time>
          &mdash;
          <time dateTime={this.state.end}>
            {new Date(this.state.end).toLocaleTimeString('NL-nl', { hour: '2-digit', minute: '2-digit' })}
          </time>
        </p>

        {this.state.degrees !== null && this.state.degrees.length > 0 && (
          <>
            <div className='event-view__divider'>
              <p className='event-view__section-header'>Degrees</p>
            </div>

            <div className='event-view__tags'>
              {this.state.degrees.map(tagId => {
                const tag = degreeById[tagId]

                return <Tag key={tag.id} label={tag.tooltip} selectable={false} />
              })}
            </div>
          </>
        )}

        <div className='event-view__divider'>
          <p className='event-view__section-header'>Description</p>
        </div>

        <MDEditor.Markdown
          className='event-view__markdown'
          source={this.state.description}
          previewOptions={{
            rehypePlugins: [[rehypeSanitize]],
          }}
        />
      </Container>
    )
  }
}

export default EventView

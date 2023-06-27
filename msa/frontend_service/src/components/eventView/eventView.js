import React from 'react'
import MDEditor from '@uiw/react-md-editor'
import rehypeSanitize from 'rehype-sanitize'
import { Container, Row, Col } from 'react-bootstrap'

import api from '../../api'
import { degrees } from '../../api'
import graphqlFields from '../../api/graphqlFields'
import Tag from '../tag/tag'

import './eventView.scss'

class EventView extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      ...Object.fromEntries(
        graphqlFields["Event"].map(f => [f, null])
      ),
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
    return <Container className='mt-2' data-color-mode='light'>

      <Row>
        <Col sm={8}>
          <h1>{this.state.name}</h1>

          <div className='list-item__tags'>
            {this.state.degrees ?
             this.state.degrees.map(tag => <Tag label={tag} selectable={false}/>) :
             null}
          </div>

          <MDEditor.Markdown
            source={this.state.description}
            previewOptions={{
              rehypePlugins: [[rehypeSanitize]],
            }}
          />
        </Col>

        <Col>
          <h4>When</h4>
          <p>
            <time dateTime={this.state.start}>
              {(new Date(this.state.start)).toLocaleDateString('NL-nl')}
            </time>
            ,&ensp;
            <time dateTime={this.state.start}>
              {(new Date(this.state.start)).toLocaleTimeString('NL-nl', {hour: '2-digit', minute: '2-digit'})}
            </time>
            &ensp;&mdash;&ensp;
            <time dateTime={this.state.end}>
              {(new Date(this.state.end)).toLocaleTimeString('NL-nl', {hour: '2-digit', minute: '2-digit'})}
            </time>
          </p>

          <h4>Degrees</h4>
            <ul>
              {this.state.degrees ?
               this.state.degrees.map(tag => <li>{degrees[tag]}</li>) :
               null}
            </ul>

          <h4>Map</h4>
          {this.state.eventImage ?
            <img width='100%' src={this.state.eventImage} alt='Map of the event' /> :
            <p>Picture unavailable</p>
          }
        </Col>
      </Row>
    </Container>
  }
}

export default EventView

import React from 'react'
import MDEditor from '@uiw/react-md-editor'
import rehypeSanitize from 'rehype-sanitize'
import { Card, Button } from 'react-bootstrap'
import { Link } from 'react-router-dom'

import api from '../../api'
import graphqlFields from '../../api/graphqlFields'
import Tag from '../tag/tag'

import './eventCard.scss'

class EventCard extends React.Component {
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
    return <Card style={{ width: '24rem', height: '34rem' }}>
      <Card.Img variant='top' src={this.state.image} />
      <Card.Body className='d-flex flex-column'>
        <Card.Title>{this.state.name}</Card.Title>
        <Card.Subtitle className='mb-3'>
          <small className='text-muted'>
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
          </small>
          <div className='list-item__tags mt-3'>
            {this.state.degrees && this.state.degrees.map(
              d => <Tag label={d} selectable={false}/>
            )}
          </div>
        </Card.Subtitle>
        <Card.Text>
          <MDEditor.Markdown
            source={this.state.description}
            previewOptions={{
              rehypePlugins: [[rehypeSanitize]],
            }}
          />
        </Card.Text>
        <Link className='mt-auto' to={`${this.state.evid}/`}>
          <Button variant='primary'>More info</Button>
        </Link>

      </Card.Body>
    </Card>
  }
}

export default EventCard

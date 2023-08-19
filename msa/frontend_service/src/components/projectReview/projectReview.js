import React from 'react'
import MDEditor from '@uiw/react-md-editor'
import rehypeSanitize from 'rehype-sanitize'

import { Container, Button } from 'react-bootstrap'

import api from '../../api'

import './style.scss'
import Tag from '../tag/tag'

// Expects params.pid and params.enid as props
class ProjectEditor extends React.Component {
  // TODO: have a controlled input rather than uncontrolled (i.e. update state
  // as form is edited) for name
  constructor(props) {
    super(props)

    this.state = {
      comments: [],
      newComment: '',
      project: {
        pid: '',
        name: '',
        description: '',
        environment: '',
        expectations: '',
        evids: [],
        degrees: [],
        tags: [],
        email: '',
        status: '',
        numberOfStudents: null,
      },
    }

    this.comment = this.comment.bind(this)
    this.reject = this.reject.bind(this)
    this.requestChanges = this.requestChanges.bind(this)
    this.approve = this.approve.bind(this)
    this.close = this.close.bind(this)
  }

  async componentDidMount() {
    // TODO: add environment, attendance and expectations to database
    if (this.props.params?.pid) {
      const project = await api.project.get(this.props.params.pid).exec()
      console.log(project)
      this.setState({project})
    } else {
      this.close()
    }
  }

  comment(message) {
    this.setState({ newComment: '', comments: [...this.state.comments, message] })
    this.props.comment(message)
    this.props.close()
  }

  reject() {
    this.props.reject()
    this.props.close()
  }

  requestChanges() {
    this.props.requestChanges()
    this.props.close()
  }

  approve() {
    this.props.approve()
    this.props.close()
  }

  close() {
    this.props.close()
  }

  reviewButtons = [
    {
      label: 'Reject',
      onClick: this.reject,
    },
    {
      label: 'Request Changes',
      onClick: this.requestChanges,
    },
    {
      label: 'Approve',
      onClick: this.approve,
    },
    {
      label: 'Close',
      onClick: this.close,
    },
  ]

  getDataInputs = () => (
    <Container className='project-review__container' data-color-mode='light'>
      <h1 className='mb-4'>Review Project</h1>
      <div className='project-review__data-and-comments'>
        <div className='project-review__data'>
          <div className='project-review__fields'>
            <div className='project-review__field'>
              <p className='project-review__text--micro'>Status of Review</p>
              <Tag
                className={`project-review__status project-review__status--${(this.state.project.status || 'pending')
                  .replace(' ', '-')
                  .toLowerCase()}`}
                label={this.state.project.status || 'Not reviewed'}
              />
            </div>

            <div className='project-review__field'>
              <p className='project-review__text--micro'>Project Name</p>
              <p className='project-review__text--value'>{this.state.project.name}</p>
            </div>

            <div className='project-review__field'>
              <p className='project-review__text--micro'>Contact Email</p>
              <a href={`mailto:${this.state.project.email}`}>
                <p className='project-review__text--value'>{this.state.project.email}</p>
              </a>
            </div>

            {this.state.project.numberOfStudents && (
              <div className='project-review__field'>
                <p className='project-review__text--micro'>Amount of Students</p>
                <p className='project-review__text--value'>{this.state.project.numberOfStudents}</p>
              </div>
            )}

            <div className='project-review__field'>
              <p className='project-review__text--micro'>Degrees</p>
              <div className='project-review__tags'>
                {[...this.state.project.degrees, ...this.state.project.tags].map(tag => (tag &&
                  <>
                    <Tag key={tag} label={tag.split('.').reverse()[0]} />
                  </>
                ))}
              </div>
            </div>
          </div>

          <div className='project-review__field'>
            <p className='project-review__text--micro'>Project Description</p>
            <MDEditor.Markdown
              className='project-review__markdown'
              source={this.state.project.description}
              previewOptions={{ rehypePlugins: [[rehypeSanitize]] }}
            />
          </div>

          <div className='project-review__field'>
            <p className='project-review__text--micro'>Project Environment</p>
            <MDEditor.Markdown
              className='project-review__markdown'
              source={this.state.project.environment}
              previewOptions={{ rehypePlugins: [[rehypeSanitize]] }}
            />
          </div>

          {this.state.project.expectations && (
            <div className='project-review__field'>
              <p className='project-review__text--micro'>Expectations</p>
              <MDEditor.Markdown
                className='project-review__markdown'
                source={this.state.project.expectations}
                previewOptions={{ rehypePlugins: [[rehypeSanitize]] }}
              />
            </div>
          )}
        </div>
        <div className='project-review__comments'>
          <h2 className='project-review__text--header'>Comments</h2>
          <div className='project-review__comments-list'>
            {this.state.comments.map((comment, index) => (
              <div key={index} className='project-review__comment'>
                <MDEditor.Markdown
                  className='project-review__markdown'
                  source={comment}
                  previewOptions={{ rehypePlugins: [[rehypeSanitize]] }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className='project-review__bottom-drawer'>
        <p className='project-review__comment-text'>Add a comment</p>

        <MDEditor
          value={this.state.newComment}
          onChange={value => this.setState({ newComment: value })}
          className='project-review__markdown-editor'
        />
        <Button
          variant='primary'
          className='project-review__button-comment'
          onClick={() => this.comment(this.state.newComment)}
        >
          Comment
        </Button>
        <Button
          variant='secondary'
          className='project-review__button-comment'
          onClick={() => this.setState({ newComment: '' })}
        >
          Clear
        </Button>

        <div className='project-review__divider' />

        <div className='project-review__buttons'>
          {this.reviewButtons.map(({ label, onClick }, index) => (
            <Button
              key={index}
              variant={label === 'Close' ? 'secondary' : 'primary'}
              onClick={onClick}
              className={`project-review__button-${label.replace(' ', '-').toLowerCase()}`}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>
    </Container>
  )

  render = () => this.getDataInputs()
}

export default ProjectEditor

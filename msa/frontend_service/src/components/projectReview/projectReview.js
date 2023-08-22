import MDEditor from '@uiw/react-md-editor'
import React from 'react'
import { Button, Container } from 'react-bootstrap'
import rehypeSanitize from 'rehype-sanitize'

import api from '../../api'
import { getMasterTag } from '../../utilities/masters'
import Tag from '../tag/tag'

import './style.scss'

// Expects params.pid as props
class ProjectReview extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
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
        comments: [],
      },
    }

    this.comment = this.comment.bind(this)
    this.reject = this.reject.bind(this)
    this.requestChanges = this.requestChanges.bind(this)
    this.approve = this.approve.bind(this)
    this.close = this.close.bind(this)
  }

  async componentDidMount() {
    if (this.props.params?.pid) {
      const project = await api.project.get(this.props.params.pid).exec()
      this.setState({ project })
    } else {
      this.close()
    }
  }

  async comment(message) {
    const project = await api.project.comment(this.state.project.pid, message).exec()
    this.setState({ newComment: '', project })
  }

  async reject() {
    await api.project.setApproval(this.state.project.pid, 'rejected').exec()
    this.props.onClose()
  }

  async requestChanges() {
    await api.project.setApproval(this.state.project.pid, 'commented').exec()
    this.props.onClose()
  }

  async approve() {
    // TODO: if admin, 'preliminary', if rep 'approved'
    if (api.getApiTokenData().type === 'a') {
      await api.project.setApproval(this.state.project.pid, 'preliminary').exec()
    } else if (['r', 'ra'].includes(api.getApiTokenData().type)) {
      await api.project.setApproval(this.state.project.pid, 'approved').exec()
    }

    this.props.onClose()
  }

  close() {
    this.props.onClose()
  }

  reviewButtons() {
    return [
      {
        label: 'Reject',
        onClick: this.reject,
      },
      {
        label: 'Request Changes',
        onClick: this.requestChanges,
      },
      {
        label: api.getApiTokenData().type === 'a' ? 'Partially approve' : 'Approve',
        onClick: this.approve,
      },
      {
        label: 'Close',
        onClick: this.close,
      },
    ]
  }

  getDataInputs = () => (
    <Container className='project-review__container' data-color-mode='light'>
      <h1 className='mb-4'>Review Project</h1>
      <div className='project-review__data-and-comments'>
        <div className='project-review__data'>
          <div className='project-review__fields'>
            <div className='project-review__field'>
              <p className='project-review__text--micro'>Status of Review</p>
              <Tag
                className={`project-review__status project-review__status--${(this.state.project.approval || 'pending')
                  .replace(' ', '-')
                  .toLowerCase()}`}
                label={this.state.project.approval || 'Not reviewed'}
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
                {this.state.project.degrees.map(tagId => {
                  return getMasterTag(Tag, tagId)
                })}
                {this.state.project.tags.map(
                  tag =>
                    tag && (
                      <>
                        <Tag key={tag} label={tag.split('.').reverse()[0]} />
                      </>
                    )
                )}
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
            {this.state.project.comments?.map((comment, index) => (
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
          onClick={async () => await this.comment(this.state.newComment)}
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
          {this.reviewButtons().map(({ label, onClick }, index) => (
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

export default ProjectReview

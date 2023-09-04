import MDEditor from '@uiw/react-md-editor'
import React from 'react'
import { Button, Container, DropdownButton, Dropdown } from 'react-bootstrap'
import rehypeSanitize from 'rehype-sanitize'

import api from '../../api'
import { getMasterTag } from '../../utilities/masters'
import Tag from '../tag/tag'
import { degreeTagById } from '../../utilities/degreeDefinitions'

import './style.scss'

// Expects params.pid as props
class ProjectReview extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      newComment: '',
      selectedDegree: undefined,
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
        adminApproval: null,
        academicApproval: [],
      },
    }

    this.comment = this.comment.bind(this)
    this.reject = this.reject.bind(this)
    this.requestChanges = this.requestChanges.bind(this)
    this.approve = this.approve.bind(this)
    this.partiallyApprove = this.partiallyApprove.bind(this)
    this.close = this.close.bind(this)
    this.getAcademicApproval = this.getAcademicApproval.bind(this)
  }

  getAcademicApproval() {
    return this.state.project.academicApproval.find(e => e.degree == this.state.selectedDegree)?.approval
  }

  async componentDidMount() {
    if (this.props.params?.pid) {
      const project = await api.project.get(this.props.params.pid).exec()
      this.setState({ project })
      this.setState({ selectedDegree: project.degrees[0] })
    } else {
      this.close()
    }
  }

  async comment(message) {
    try {
      const project = await api.project.comment(this.state.project.pid, message).exec()

      this.setState({ newComment: '', project })
    } catch (error) {
      console.log(error)
    }
  }

  async reject(event) {
    event.preventDefault()

    await api.project.setApproval(this.state.project.pid, 'rejected', this.state.selectedDegree).exec()
    this.props.onClose()
  }

  async requestChanges(event) {
    event.preventDefault()

    await api.project.setApproval(this.state.project.pid, 'commented', this.state.selectedDegree).exec()

    // TODO: Email the users that their project has been commented on
    // console.log(this.state.project.enid.toString(), this.state.project.pid)

    // try {
    //   await api.entity.requestChanges(this.state.project.enid.toString(), this.state.project.pid).exec()
    // } catch (error) {
    //   console.log(error)
    // }

    this.props.onClose()
  }

  async approve(event) {
    event.preventDefault()

    await api.project.setApproval(this.state.project.pid, 'approved', this.state.selectedDegree).exec()

    this.props.onClose()
  }

  async partiallyApprove(event) {
    event.preventDefault()

    await api.project.setApproval(this.state.project.pid, 'preliminary', this.state.selectedDegree).exec()

    this.props.onClose()
  }

  close(event) {
    if (event) event.preventDefault()
    this.props.onClose()
  }

  reviewButtons() {
    const rejectReqChanges = [
      {
        label: 'Reject',
        onClick: this.reject,
      },
      {
        label: 'Request Changes',
        onClick: this.requestChanges,
      },
    ]

    const approveClose = [
      {
        label: 'Approve',
        onClick: this.approve,
      },
      {
        label: 'Close',
        onClick: this.close,
      },
    ]

    if (api.getApiTokenData().type === 'a') {
      return [
        ...rejectReqChanges,
        {
          label: 'Partially Approve',
          onClick: this.partiallyApprove,
        },
        ...approveClose,
      ]
    }

    return [...rejectReqChanges, ...approveClose]
  }

  getDataInputs = () => (
    <Container className='project-review__container' data-color-mode='light'>
      <h1 className='mb-4'>Review Project</h1>
      <DropdownButton id="dropdown-basic-button" title={`Reviewing for ${degreeTagById[this.state.selectedDegree]}`}>
        {
          this.state.project.degrees.map(id =>
            <Dropdown.Item onClick={() => this.setState({selectedDegree: id})}>{degreeTagById[id]}</Dropdown.Item>
          )
        }
      </DropdownButton>
      <div className='project-review__content'>
        <div className='project-review__fields'>
          <div className='project-review__field'>
            <p className='project-review__text--micro'>Admin Review Status</p>
            <Tag
              className={`project-review__status project-review__status--${(this.state.project.adminApproval || 'pending')
                .replace(' ', '-')
                .toLowerCase()}`}
              label={this.state.project.adminApproval || 'Not reviewed'}
            />
          </div>

          <div className='project-review__field'>
            <p className='project-review__text--micro'>Status of Review</p>
            <Tag
              className={`project-review__status project-review__status--${(this.getAcademicApproval() || 'pending')
                .replace(' ', '-')
                .toLowerCase()}`}
              label={this.getAcademicApproval() || 'Not reviewed'}
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

      <div className='project-review__content mt-4'>
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
          {this.state.project.comments?.length === 0 && <p className='project-review__text--value'>No comments yet</p>}
        </div>
      </div>

      <div className='project-review__content mt-4'>
        <h2 className='project-review__text-header'>Add a comment</h2>

        <MDEditor
          value={this.state.newComment}
          onChange={value => this.setState({ newComment: value })}
          className='project-review__markdown-editor'
        />

        <div className='project-review__buttons'>
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
        </div>

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

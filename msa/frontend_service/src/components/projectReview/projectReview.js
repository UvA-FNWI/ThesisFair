import MDEditor from '@uiw/react-md-editor'
import React from 'react'
import { Button, Container, Dropdown, DropdownButton } from 'react-bootstrap'
import rehypeSanitize from 'rehype-sanitize'

import api from '../../api'
import * as session from '../../session'
import { degreeTagById } from '../../utilities/degreeDefinitions'
import { getFairLabel } from '../../utilities/fairs'
import { getMasterTag } from '../../utilities/masters'
import Tag from '../tag/tag'

import './style.scss'

// Expects params.pid as props
class ProjectReview extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      newComment: '',
      selectedDegree:
        api.getApiTokenData().type === 'a'
          ? undefined
          : session.getSessionData('reviewingDegrees') && JSON.parse(session.getSessionData('reviewingDegrees')).at(-1),
      entity: {
        name: undefined,
      },
      evids: [],
      allEventsByEvid: {},
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
        approval: null,
        academicApproval: [],
      },
    }

    this.comment = this.comment.bind(this)
    this.reject = this.reject.bind(this)
    this.requestChanges = this.requestChanges.bind(this)
    this.approve = this.approve.bind(this)
    this.partiallyApprove = this.partiallyApprove.bind(this)
    this.close = this.close.bind(this)
    this.getApproval = this.getApproval.bind(this)
    this.getAcademicApproval = this.getAcademicApproval.bind(this)
    this.humanizeApproval = this.humanizeApproval.bind(this)
    this.getFairLabel = this.getFairLabel.bind(this)
  }

  getFairLabel() {
    const fairLabel = getFairLabel(this.state.project.evids.map(evid => this.state.allEventsByEvid?.[evid]))

    return <Tag label={fairLabel} className='mr-2' />
  }

  getApproval() {
    if (this.state.project.approval === 'approved') return 'preliminary'

    return this.state.project.approval || 'awaiting'
  }

  getAcademicApproval() {
    if (!this.state.selectedDegree) {
      return this.getApproval()
    }

    return this.state.project.academicApproval.find(e => e.degree === this.state.selectedDegree)?.approval || 'awaiting'
  }

  humanizeApproval(approval) {
    switch (approval) {
      case 'commented':
        return 'Changes requested'
      case 'rejected':
        return 'Rejected'
      case 'approved':
        return 'Approved'
      case 'preliminary':
        return 'Partially approved'
      default:
        return 'Not reviewed'
    }
  }

  async componentDidMount() {
    if (this.props.params?.pid) {
      const project = await api.project.get(this.props.params.pid).exec()
      this.setState({ project })

      if (api.getApiTokenData().type !== 'a' && !this.state.selectedDegree) {
        this.setState({ selectedDegree: project.degrees[0] })
      }

      const entity = await api.entity.get(project.enid).exec()
      this.setState({ entity })

      const currentEvents = await api.event.getActive().exec()
      const allEventsByEvid = Object.fromEntries(currentEvents.map(event => [event.evid, event]))
      this.setState({ allEventsByEvid })
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
    // this.props.onClose()
    window.location.reload()
  }

  async requestChanges(event) {
    event.preventDefault()

    await api.project.setApproval(this.state.project.pid, 'commented', this.state.selectedDegree).exec()

    // this.props.onClose()
    window.location.reload()
  }

  async approve(event) {
    event.preventDefault()

    await api.project.setApproval(this.state.project.pid, 'approved', this.state.selectedDegree).exec()

    // this.props.onClose()
    window.location.reload()
  }

  async partiallyApprove(event) {
    event.preventDefault()

    await api.project.setApproval(this.state.project.pid, 'approved').exec()

    // this.props.onClose()
    window.location.reload()
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

    if (!this.state.selectedDegree) {
      return [
        ...rejectReqChanges,
        {
          label: 'Partially Approve',
          onClick: this.partiallyApprove,
        },
        {
          label: 'Close',
          onClick: this.close,
        },
      ]
    }

    return [...rejectReqChanges, ...approveClose]
  }

  getDataInputs = () => (
    <Container className='project-review__container' data-color-mode='light'>
      <h1 className='mb-4'>Review Project</h1>
      <DropdownButton
        id='dropdown-basic-button'
        title={`Reviewing for ${degreeTagById[this.state.selectedDegree] || 'partial approval'}`}
      >
        {api.getApiTokenData().type === 'a' && (
          <Dropdown.Item onClick={() => this.setState({ selectedDegree: undefined })}>
            For partial approval
          </Dropdown.Item>
        )}
        {this.state.project.degrees.map(id => (
          <Dropdown.Item key={id} onClick={() => this.setState({ selectedDegree: id })}>
            {degreeTagById[id]}
          </Dropdown.Item>
        ))}
      </DropdownButton>
      <div className='project-review__content'>
        <div className='project-review__fields'>
          <div className='project-review__field'>
            <p className='project-review__text--micro'>Admin Review Status</p>
            <Tag
              className={`project-review__status project-review__status--${this.getApproval()
                .replace(' ', '-')
                .toLowerCase()}`}
              label={this.humanizeApproval(this.getApproval())}
            />
          </div>

          <div className='project-review__field'>
            <p className='project-review__text--micro'>Status of Review</p>
            <Tag
              className={`project-review__status project-review__status--${this.getAcademicApproval()
                .replace(' ', '-')
                .toLowerCase()}`}
              label={this.humanizeApproval(this.getAcademicApproval())}
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

          <div className='project-review__field'>
            <p className='project-review__text--micro'>Organization</p>
            <p className='project-review__text--value'>{this.state.entity.name}</p>
          </div>

          <div className='project-review__field'>
            <p className='project-review__text--micro'>Fairs</p>
            <p className='project-review__text--value'>{this.getFairLabel()}</p>
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

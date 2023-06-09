import React from 'react'
import { useParams } from 'react-router-dom'
import { Container, Table, Form, Button, Modal } from 'react-bootstrap'
import EditIcon from 'bootstrap-icons/icons/pencil-square.svg'
import SaveIcon from 'bootstrap-icons/icons/check-lg.svg'
import api from '../../api'
import RepresentativeList from '../../components/representativeList/representativeList'

class TableRow extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      location: this.props.entity.location,
      description: this.props.entity.description,
      editing: false,
      modal: false,
    }
  }

  toggleEditing = async () => {
    if (!this.state.editing) {
      this.setState({ editing: true })
      return
    }

    await api.entity
      .update({
        enid: this.props.entity.enid,
        description: this.state.description,
        location: this.state.location,
      })
      .exec()

    this.setState({
      editing: false,
    })
  }

  manageUsersPopup = () => (
    <Modal show={true} onHide={() => this.setState({ modal: false })} size='lg'>
      <Modal.Header closeButton>Users of "{this.props.entity.name}"</Modal.Header>

      <Modal.Body>
        <RepresentativeList enid={this.props.entity.enid} />
      </Modal.Body>
    </Modal>
  )

  render() {
    if (this.state.editing) {
      return (
        <tr>
          <td>{this.props.entity.name}</td>
          <td>
            <Form.Control
              as='textarea'
              value={this.state.description}
              onChange={e => this.setState({ description: e.target.value })}
            />
          </td>
          <td>
            <Form.Control value={this.state.location} onChange={e => this.setState({ location: e.target.value })} />
          </td>
          <td>
            <img src={SaveIcon} alt='save' onClick={this.toggleEditing} />
          </td>
        </tr>
      )
    }

    return (
      <>
        {this.state.modal ? this.manageUsersPopup() : null}
        <tr>
          <td>{this.props.entity.name}</td>
          <td>{this.state.description}</td>
          <td>{this.state.location}</td>
          <td style={{ width: '1px', whiteSpace: 'nowrap' }}>
            <img src={EditIcon} alt='edit' onClick={this.toggleEditing} />
          </td>
          <td style={{ width: '1px', whiteSpace: 'nowrap' }}>
            <Button onClick={() => this.setState({ modal: true })}>Manage users</Button>
          </td>
        </tr>
      </>
    )
  }
}

class EventEntities extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      event: {},
      entities: [],
      importingReps: false,
    }
  }

  async componentDidMount() {
    const event = await api.event.get(this.props.params.evid).exec()
    const entities = await api.entity
      .getMultiple(event.entities, { enid: true, name: true, description: true, location: true })
      .exec()

    this.setState({ event, entities })
  }

  importRepresentatives = async () => {
    if (this.state.importingReps) {
      return
    }

    const input = document.createElement('input')
    input.type = 'file'
    input.onchange = async () => {
      const blob = input.files.item(0)
      if (!blob) {
        input.remove()
        return
      }

      const reader = new FileReader()
      reader.onloadend = async () => {
        this.setState({ importingReps: true })
        input.remove()
        const error = await api.user.representative.import(reader.result).exec()
        if (error) {
          this.setState({ importingReps: false, importingRepsError: error.message })
          return
        }
        this.setState({ importingReps: false, importingRepsDone: true })
      }
      reader.readAsText(blob)
    }
    input.click()
  }

  render() {
    return (
      <Container className='mt-2'>
        <div className='mb-4'>
          <h1>Companies</h1>
          <Button onClick={this.importRepresentatives}>
            {this.state.importingReps ? 'Creating representatives...' : 'Batch create representatives'}
          </Button>
          {this.state.importingRepsError ? (
            <>
              <br />
              <span style={{ color: 'red' }}>{this.state.importingRepsError}</span>
            </>
          ) : null}
          {this.state.importingRepsDone ? (
            <>
              <br />
              <span style={{ color: 'green' }}>Representatives have been imported</span>
            </>
          ) : null}
        </div>
        <Table striped bordered hover>
          <thead>
            <tr>
              <th>Organisation</th>
              <th>Description</th>
              <th>Location</th>
              <th></th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {this.state.entities.map(entity => (
              <TableRow key={entity.enid} entity={entity} />
            ))}
          </tbody>
        </Table>
      </Container>
    )
  }
}

function EventEntitiesWithParams(props) {
  const params = useParams()

  return <EventEntities {...props} params={params} />
}

export default EventEntitiesWithParams

import React from 'react'
import { Button, Form, Modal } from 'react-bootstrap'

import Nav from 'react-bootstrap/Nav'
import organisationsIcon from 'bootstrap-icons/icons/building.svg'

import api from '../../api'
import * as session from '../../session'

class SetOrganisationPopup extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      multiple: false,
      open: false,
      enid: null,
      enids: [],
    }
  }

  async componentDidMount() {
    // Fetch the amount of entities the user is part of (enids)
    const enids = (await api.user.get(api.getApiTokenData().uid, { enids: true }).exec())?.enids

    const enidNames = await Promise.all(
      enids.map(async enid => {
        const entity = await api.entity.get(enid).exec()
        return entity.name
      })
    )

    const enidWithName = enids.map((enid, index) => ({ enid, name: enidNames[index] }))

    this.setState({
      multiple: enids.length > 1,
      open: false,
      enid: session.getEnid() || enids[0],
      enids: enidWithName,
    })
  }

  save = async () => {
    session.setSessionData('enid', this.state.enid)

    this.setState({ open: false })

    window.location.reload()
  }

  getModal = () => (
    <Modal show={true} onHide={() => this.setState({ open: false })} size='lg'>
      <Modal.Header closeButton>Switch organisation</Modal.Header>

      <Modal.Body>
        <Form onSubmit={this.updatePersonalInfo}>
          <Form.Group>
            <Form.Label>Organisation</Form.Label>
            {/* Add a selector */}
            <Form.Control as='select' value={this.state.enid} onChange={e => this.setState({ enid: e.target.value })}>
              {this.state.enids.map(({ enid, name }) => (
                <option value={enid}>{name}</option>
              ))}
            </Form.Control>
          </Form.Group>

          <p style={{ color: 'red' }}>{this.state.error}</p>
        </Form>
      </Modal.Body>

      <Modal.Footer>
        <Button onClick={this.save}>Select</Button>
      </Modal.Footer>
    </Modal>
  )

  render() {
    return (
      <>
        {this.state.multiple && (
          <Nav.Item onClick={() => this.setState({ open: true })}>
            <div className='nav-link' style={{ paddingTop: '0px' }}>
              <img src={organisationsIcon} alt='' />
              <span>Switch Organisation</span>
            </div>
          </Nav.Item>
        )}
        {this.state.open ? this.getModal() : null}
      </>
    )
  }
}

export default SetOrganisationPopup

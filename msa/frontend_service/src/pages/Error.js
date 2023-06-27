import React from 'react'
import { Modal } from 'react-bootstrap'

class Error extends React.Component {
  render() {
    return (
      <Modal.Dialog>
        <Modal.Header>
          <Modal.Title>An error occured</Modal.Title>
        </Modal.Header>
        <Modal.Body>{decodeURIComponent(window.location.hash.substring(1))}</Modal.Body>
      </Modal.Dialog>
    )
  }
}

export default Error

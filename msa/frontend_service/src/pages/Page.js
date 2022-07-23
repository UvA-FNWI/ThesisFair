import React from 'react';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';

import Navbar from '../components/navbar/navbar';

class Page extends React.Component {
  render() {
    return (
      <div style={{ display: 'flex' }}>
        <Navbar />
        <div className='page-content'>
          {this.props.page}
        </div>
      </div>
      // <Container fluid>
      //   <Row>
      //     <Col xs={1} style={{ paddingLeft: 0 }}>
      //     </Col>
      //     <Col>
      //       {this.props.page}
      //     </Col>
      //   </Row>
      // </Container>
    );
  }
}

export default Page;

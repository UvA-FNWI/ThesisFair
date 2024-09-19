import cl from 'clsx'
import React from 'react'
import { Button, Card } from 'react-bootstrap'

import Tag from '../tag/tag'

import './paymentCard.scss'

class PaymentCard extends React.Component {
  render() {
    return (
      <Card className='payment-card'>
        <Card.Body className='d-flex flex-column'>
          <Card.Title>{this.props.title}</Card.Title>
          <Card.Subtitle className='payment-card__subtitle'>
            <small className='text-muted'>{this.props.subtitle}</small>
          </Card.Subtitle>
          <Card.Text className='payment-card__body'>
            <div className='payment-card__tags'>
              <Tag
                key='type'
                className='tag--payment-card'
                label={`Status: ${this.props.status || 'unknown'}`}
                tooltip={this.props.status.tooltip}
                selectable={false}
              />
            </div>

            {/* TODO: make buttons unclickable when invoice has been requested */}
            <div className='payment-card__buttons'>
              <Button onClick={this.props.onPay}>Pay</Button>
              <Button variant='secondary' href='https://forms.office.com/e/XNCdbq4Gf6'>
                Request invoice
              </Button>
            </div>
            {this.props.isAdmin && (
              <Button
                className={cl('payment-card__admin-button', {
                  'payment-card__admin-button--paid': this.props.status === 'paid',
                })}
                onClick={() => this.props.status !== 'paid' && this.props.onMarkAsPaid}
                disabled={this.props.status === 'paid'}
              >
                Mark as paid
              </Button>
            )}
          </Card.Text>
        </Card.Body>
      </Card>
    )
  }
}

export default PaymentCard

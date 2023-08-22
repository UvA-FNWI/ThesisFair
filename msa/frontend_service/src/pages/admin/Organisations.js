import fuzzysort from 'fuzzysort'
import React from 'react'
import { Button, Container, Form } from 'react-bootstrap'
import { Link, useParams } from 'react-router-dom'

import api from '../../api'
import EntityList from '../../components/entityList/entityList'
import Tag from '../../components/tag/tag'
import { getParticipatingFairs } from '../../utilities/entities'
import { getPaymentTagClassName, getPaymentTooltip } from '../../utilities/fairs'

import '../../styles/events.scss'

class Entities extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      entities: [],
      allEvents: [],
      allEventsByEvid: {},
      entitiesByEnid: {},
      entityNames: [],
      filteredEntities: [],
      searchFilter: '',
      error: false,
    }
  }

  search = searchFilter => {
    if (searchFilter === this.state.searchFilter) return
    if (searchFilter === '' || searchFilter === null) {
      this.setState({ filteredEntities: this.state.entities, searchFilter: '' })
      return
    }

    // Ignore searches with less than 3 characters
    if (this.state.searchFilter?.length < 3 && searchFilter.length < 3) return

    if (searchFilter?.length < 3) {
      this.setState({ filteredEntities: this.state.entities, searchFilter: '' })
      return
    }

    // If the search filter is extended, only search through the previous results
    if (searchFilter.startsWith(this.state.searchFilter)) {
      this.setState({
        filteredEntities: fuzzysort
          .go(searchFilter, this.state.filteredEntities, { key: 'name', limit: 25, threshold: -5000 })
          .map(e => this.state.entitiesByEnid[e.obj.enid]),
        searchFilter,
      })

      return
    }

    this.setState({
      filteredEntities: fuzzysort
        .go(searchFilter, this.state.entityNames, { key: 'name', limit: 25, threshold: -5000 })
        .map(e => this.state.entitiesByEnid[e.obj.enid]),
      searchFilter,
    })
  }

  async componentDidMount() {
    let entities
    try {
      entities = await api.entity.getAll(null, { enid: true, name: true, type: true, payments: true }).exec()
    } catch (error) {
      console.log(error)
      this.setState({ error: true })
    }

    if (!entities || entities.length === 0) {
      this.setState({ error: true })
      return
    }

    // Fetch info about all events to pass on to entries on entities, so they
    // don't have to fetch it (state passes down)
    let events
    try {
      events = await api.event.getAll().exec()
    } catch (error) {
      console.log(error)
      this.setState({ error: true })
    }

    if (!events || events.length === 0) {
      this.setState({ error: true })
      return
    }

    const entityNames = entities.map(entity => ({ enid: entity.enid, name: entity.name }))
    const entitiesByEnid = Object.fromEntries(entities.map(entity => [entity.enid, entity]))
    const allEventsByEvid = Object.fromEntries(events.map(event => [event.evid, event]))

    this.setState({
      entities,
      entitiesByEnid,
      entityNames,
      filteredEntities: entities,
      allEvents: events,
      allEventsByEvid,
    })
  }

  changeEntityType = async (enid, event) => {
    const type = event.target.value

    const entity = {
      enid,
      type,
    }

    try {
      await api.entity.update(entity).exec()
    } catch (error) {
      console.log(error)
    }
  }

  getNoResultText() {
    switch (true) {
      // First case assumes there is at least one entity
      case !this.state.error && this.state.entities?.length === 0:
        return 'Loading...'
      case !this.state.error && this.state.filteredEntities?.length === 0:
        return 'No organisations found with the given search term.'
      default:
        return 'Something went wrong while loading the organisations.'
    }
  }

  render() {
    return (
      <Container>
        <h1 className='events-page__header'>Organisations</h1>

        <Link to='/organisation/create/'>
          <Button variant='outline-primary'>Create new organisation</Button>
        </Link>

        <Form className='search-bar'>
          <Form.Group className='mb-3' controlId='searchBar'>
            <Form.Control
              type='text'
              placeholder='Search (type at least 3 characters)'
              onInput={e => this.search(e.target.value)}
            />
          </Form.Group>
        </Form>

        {this.state.filteredEntities?.length > 0 ? (
          <EntityList
            items={this.state.filteredEntities.map(entity => ({
              enid: entity.enid,
              name: entity.name,
              getTags: async () => {
                const fairs = getParticipatingFairs(api.project.getOfEntity, this.state.allEventsByEvid, entity)

                return fairs?.map(fair => {
                  const payment = entity.payments?.filter(
                    payment => new Date(payment.eventDate).setHours(0, 0, 0, 0) === fair.date
                  )?.[0]

                  return {
                    ...fair,
                    payment,
                  }
                })
              },
              createTag: ({ date, events, name, payment }) => (
                <Tag
                  key={`payment-${events[0].evid}`}
                  className={getPaymentTagClassName(payment?.status)}
                  label={name}
                  tooltip={getPaymentTooltip(events, date, payment?.status)}
                  selectable={false}
                  onClick={() => payment?.url && window.open(payment.url, '_blank').focus()}
                />
              ),
              headerButtons: () => (
                <>
                  <Form.Select
                    size='md'
                    onChange={e => this.changeEntityType(entity.enid, e)}
                    defaultValue={entity.type}
                  >
                    <option value='A'>Type A</option>
                    <option value='B'>Type B</option>
                    <option value='C'>Type C</option>
                    <option value='Partner'>Partner</option>
                    <option value='Lab42'>Lab 42</option>
                    <option value='Free'>Free</option>
                  </Form.Select>
                  <Link to={`/organisation/${entity.enid}/edit/`}>
                    <Button variant='primary'>Edit</Button>
                  </Link>
                </>
              ),
            }))}
          />
        ) : (
          <p>{this.getNoResultText()}</p>
        )}
      </Container>
    )
  }
}

function EntitiesWithParams(props) {
  const params = useParams()

  return <Entities {...props} params={params} />
}

export default EntitiesWithParams

import React from "react";

import { useParams } from "react-router-dom";
import chevronDownIcon from "bootstrap-icons/icons/chevron-down.svg";
import closeIcon from "bootstrap-icons/icons/x-lg.svg";
import gripIcon from "bootstrap-icons/icons/grip-vertical.svg";

import "./registrationList.scss";
import api from "../../api";

function RegistrationListItem(props) {
  const params = useParams();
  const type = api.getApiTokenData().type;

  const [isExpanded, setIsExpanded] = React.useState(false);

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  const addRegistration = () => {
    // TODO: Add registration
    console.warn("Add registration not implemented");
  };

  const removeRegistration = () => {
    // TODO: Remove registration
    console.warn("Remove registration not implemented");
  };

  return (
    <li className="list-item">
      <div className="list-item__header">
        {props.selected && (
          <img
            className="list-item__icon list-item__icon--grip"
            src={gripIcon}
            alt="grip icon"
          />
        )}

        {/* Add list-item__icon, list-item__icon--expand and add a rotated class if isExpanded */}

        <img
          className={`list-item__icon list-item__icon--expand${
            isExpanded ? " list-item__icon--rotated" : ""
          }`}
          src={chevronDownIcon}
          alt="expand icon"
          onClick={toggleExpanded}
        />

        <div className="list-item__title">
          <p>{props.registration.name}</p>
        </div>

        {/* TODO: Show only MSc tags when expanded */}
        {props.registration.tags && !props.selected && (
          <div className="list-item__tags">
            {props.registration.tags.map(({ fullTag, abbreviation }) => (
              <div className="list-item__tag" key={fullTag}>
                <p>{abbreviation.toString()}</p>
              </div>
            ))}
          </div>
        )}

        {props.selected && (
          <img
            className="list-item__icon list-item__icon--close"
            src={closeIcon}
            alt="close icon"
            onClick={removeRegistration}
          />
        )}
      </div>

      {/* Expanded view */}
      {isExpanded && (
        <div className="list-item__expanded">
          <p className="list-item__email">{props.registration.email}</p>

          <p className="list-item__description">
            {props.registration.description}
          </p>

          {!props.selected && (
            <div className="list-item__buttons">
              <button
                className="list-item__button list-item__button--hide"
                onClick={toggleExpanded}
              >
                Hide
              </button>

              <button
                className="list-item__button list-item__button--add"
                onClick={addRegistration}
              >
                Add
              </button>
            </div>
          )}
        </div>
      )}
    </li>
  );
}

export default RegistrationListItem;

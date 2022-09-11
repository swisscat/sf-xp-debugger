import React, { Component, ReactElement } from "react";
export interface TabProps {
  activeTab: string;
  label: string;
  onClick: Function;
}
interface TabsProps {
  appName: string;
  children: Array<ReactElement>;
}

interface TabsState {
  activeTab: string;
}

class Tab extends Component<TabProps> {
  render() {
    const { activeTab, label, onClick } = this.props;
    return (
      <li
        className={`slds-context-bar__item${activeTab === label ? " slds-is-active" : ""}`}
        onClick={() => {
          onClick(label);
        }}
      >
        <a href="#top" className="slds-context-bar__label-action">
          <span className="slds-truncate">{label}</span>
        </a>
      </li>
    );
  }
}

export default class Tabs extends Component<TabsProps, TabsState> {
  constructor(props: TabsProps) {
    super(props);

    this.state = {
      activeTab: this.props.children[0].props['data-label'],
    };
  }
  state: TabsState = {
    activeTab: "",
  };
  render() {
    const {
      props: { appName, children },
      state: { activeTab },
    } = this;
    return (
      <div>
        <div className="slds-context-bar">
          <div className="slds-context-bar__primary">
            <div className="slds-context-bar__item slds-context-bar__dropdown-trigger slds-dropdown-trigger slds-dropdown-trigger_click slds-no-hover">
              <span className="slds-context-bar__label-action slds-context-bar__app-name">
                <span className="slds-truncate">{appName}</span>
              </span>
            </div>
          </div>
          <nav className="slds-context-bar__secondary">
            <ul className="slds-grid">
              {children.map((child) => (
                <Tab activeTab={activeTab} label={child.props['data-label']} key={child.props['data-label']} onClick={(tab: string) => this.setState({ activeTab: tab })} />
              ))}
            </ul>
          </nav>
        </div>
        {children.map((child) => (child.props['data-label'] === activeTab ? child : null))}
      </div>
    );
  }
}

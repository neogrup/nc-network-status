import {html, PolymerElement } from '@polymer/polymer/polymer-element.js';
import '@polymer/iron-icons/iron-icons.js';
import '@polymer/iron-icons/device-icons.js';
import '@polymer/iron-ajax/iron-ajax.js';
import '@polymer/paper-ripple/paper-ripple.js';
class NcNetworkStatus extends PolymerElement {
  static get template() {
    return html`
    <style>
      :host {
        display: block;
      }

      div {
        @apply --layout-horizontal;
        @apply --layout-center;
      }

      paper-ripple {
        color: var(--app-accent-color);
      }
    </style>
    <iron-ajax 
        id="getNetworkStatus" 
        url="{{url}}" 
        method="get" 
        handle-as="json" 
        timeout=2200
        last-response="{{networkStatusData}}" 
        on-response="_handleGetNetworkStatusResponse" 
        on-error="_handleGetNetworkStatusError">
    </iron-ajax>

    <iron-ajax 
        id="getServiceStatus" 
        url="{{url}}" 
        method="get" 
        handle-as="json" 
        timeout=2200>
    </iron-ajax>

    <div>
      <iron-icon icon\$="{{signalIcon}}"></iron-icon>
      <template is="dom-if" if="{{showMs}}">
        <div>[[requestTime]]</div>
      </template>

    </div>
    <paper-ripple class="circle" initial-opacity="0.5" recenters></paper-ripple>
`;
  }

  static get properties() {
    return {
      url: {
        type: String,
        value: ''
      },
      showMs: {
        type: Boolean,
        value: false
      },
      reconnectTime: {
        type: Number,
        value: 2000
      },
      requestInitTime: {
        type: Number
      },
      requestTime: {
        type: String
      },
      signalTitle: {
        type: String,
        value: 'test'
      },
      signalIcon: {
        type: String,
        value: 'device:signal-cellular-0-bar'
      },
      serviceOnline: {
        type: Boolean,
        value: false
      },
      connectionLostTime: {
        type: Date,
      }
    };
  }

  connectedCallback() {
    super.connectedCallback();
    if (typeof this._timerId == "undefined") {
      this.retries = 0;
      this._getNetworkStatus();
    }
  }

  _getNetworkStatus() {
    this.requestInitTime = Date.now();
    this.$.getNetworkStatus.generateRequest();
  }

  _delayedGetNetworkStatus(timeout) {
    setTimeout(function() {
      this._getNetworkStatus()
    }.bind(this), timeout);
  }

  _setCurrentStatus(requestTime) {
    if (requestTime === -1) {
      this._animateIcon();
      this.signalIcon = 'device:signal-cellular-connected-no-internet-0-bar';
    } else if (requestTime > 1500) {
      this._animateIcon();
      this.signalIcon = 'device:signal-cellular-0-bar';
    } else if (requestTime > 750) {
      this.signalIcon = 'device:signal-cellular-1-bar';
    } else if (requestTime > 500) {
      this.signalIcon = 'device:signal-cellular-2-bar';
    } else if (requestTime > 170) {
      this.signalIcon = 'device:signal-cellular-3-bar';
    } else if (requestTime > 0) {
      this.signalIcon = 'device:signal-cellular-4-bar';
    } else {
      // When counter has a negative a value (because of an overflow)
      this.signalIcon = 'device:signal-cellular-2-bar';
    }
  }

  _handleGetNetworkStatusResponse(response) {
    this.requestTime = (Date.now() - this.requestInitTime) + ' ms';
    this._setCurrentStatus(Date.now() - this.requestInitTime);
    let timeNew = this.reconnectTime;
    //slow down if everything working for a while
    if (this.retries > 3) {
      timeNew = timeNew + this.reconnectTime * 2;
    } else if (this.retries > 20) {
      timeNew = timeNew + this.reconnectTime * 3;
    } else if (this.retries > 40) {
      this.retries = 0;
    }        
    this.retries = this.retries + 1;
    this._delayedGetNetworkStatus(timeNew);

    if (this.connectionLostTime != null){
      // console.debug('The app has lost connection (' + this.connectionLostTime + ') and has been recovered (' + new Date().toLocaleString() + ')');
      this.dispatchEvent(new CustomEvent('notifyAppError', {detail:{message: 'The app has lost connection (' + this.connectionLostTime + ') and has been recovered (' + new Date().toLocaleString() + ')', trace: '_handleGetNetworkStatusResponse'}, bubbles: true, composed: true }));
      this.connectionLostTime = null;
    }

  }

  _handleGetNetworkStatusError(error) {

    this._setCurrentStatus(-1);
    this.retries = 0;
    this._delayedGetNetworkStatus(this.reconnectTime);
    this.requestTime = '';

    if (this.connectionLostTime == null){
      this.connectionLostTime = new Date().toLocaleString();
    }
  }

  _animateIcon(){
    if (this.shadowRoot.querySelector('paper-ripple')){
      this.shadowRoot.querySelector('paper-ripple').downAction();
      this.shadowRoot.querySelector('paper-ripple').upAction();
    }
  }
  
  getServiceStatus() {
    return this.$.getServiceStatus.generateRequest().completes.then(
        request => this.serviceOnline = true,
        request => this.serviceOnline = false
    );
  }
}

window.customElements.define('nc-network-status', NcNetworkStatus);

import React, { useState } from 'react';
import {
  IconSchedule,
  IconAcademics,
  IconWellness,
  IconProfile,
} from './CustomIcons';
import { triggerHaptic } from '../utils/haptics';

export const NAV_TABS = [
  { id: 'Schedule', label: 'Schedule', Icon: IconSchedule },
  { id: 'Academics', label: 'Academics', Icon: IconAcademics },
  { id: 'Wellness', label: 'Wellness', Icon: IconWellness },
  { id: 'Profile', label: 'Profile', Icon: IconProfile },
];

export function BottomNav({ activeTab: controlledTab, setActiveTab: setControlledTab }) {
  const [internalTab, setInternalTab] = useState('Schedule');

  const activeTab = controlledTab !== undefined ? controlledTab : internalTab;
  const handleSelectTab = (tabId) => {
    triggerHaptic(10);
    if (setControlledTab) {
      setControlledTab(tabId);
    } else {
      setInternalTab(tabId);
    }
  };

  return (
    <nav
      className="glass-card fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl rounded-b-none border-b-0"
      aria-label="Bottom Navigation"
    >
      <div className="mx-auto flex max-w-md items-center justify-around">
        {NAV_TABS.map(({ id, label, Icon }) => {
          const isActive =
            String(activeTab).toLowerCase() === id.toLowerCase();

          return (
            <button
              key={id}
              type="button"
              onClick={() => handleSelectTab(id)}
              className={`flex flex-1 flex-col items-center justify-center py-4 transition-all duration-200 focus:outline-none ${
                isActive
                  ? 'active-icon-glow'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon
                className={`mb-1 h-5 w-5 ${
                  isActive ? 'active-icon-glow' : ''
                }`}
              />
              <span className="text-xs font-medium tracking-wide">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export default BottomNav;

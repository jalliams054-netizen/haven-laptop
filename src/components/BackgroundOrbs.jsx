import React from 'react';
import { motion } from 'framer-motion';
import { useStore } from '../store/useStore';

const ORB_CONFIGS = [
  {
    id: 'orb-1',
    positionClass: '-top-20 -left-16 w-80 h-80',
    warmClass: 'bg-gradient-to-br from-amber-500/20 to-orange-400/20 blur-[100px]',
    roughClass: 'bg-indigo-900/30 blur-[130px]',
    xRange: [-30, 30],
    yRange: [-25, 25],
    driftDuration: 11,
  },
  {
    id: 'orb-2',
    positionClass: 'top-1/4 -right-20 w-96 h-96',
    warmClass: 'bg-gradient-to-bl from-orange-400/20 to-amber-500/15 blur-[100px]',
    roughClass: 'bg-purple-900/30 blur-[140px]',
    xRange: [30, -30],
    yRange: [-30, 30],
    driftDuration: 12,
  },
  {
    id: 'orb-3',
    positionClass: 'bottom-1/4 -left-20 w-80 h-80',
    warmClass: 'bg-gradient-to-tr from-amber-500/20 to-rose-400/15 blur-3xl',
    roughClass: 'bg-purple-900/30 blur-[130px]',
    xRange: [-25, 25],
    yRange: [30, -30],
    driftDuration: 10,
  },
  {
    id: 'orb-4',
    positionClass: '-bottom-16 -right-12 w-72 h-72',
    warmClass: 'bg-gradient-to-tl from-orange-400/20 to-amber-500/20 blur-[100px]',
    roughClass: 'bg-indigo-900/30 blur-[130px]',
    xRange: [25, -25],
    yRange: [20, -20],
    driftDuration: 11.5,
  },
];

export function BackgroundOrbs({ isRoughDay: propRoughDay }) {
  const storeRoughDay = useStore((state) => state.isRoughDay);
  const isRoughDay = propRoughDay !== undefined ? propRoughDay : storeRoughDay;

  return (
    <div
      className={`pointer-events-none absolute inset-0 z-0 overflow-hidden transition-all duration-1000 ${
        isRoughDay ? 'backdrop-blur-3xl' : ''
      }`}
      aria-hidden="true"
    >
      {ORB_CONFIGS.map((orb) => (
        <motion.div
          key={orb.id}
          className={`absolute transition-colors duration-1000 ${orb.positionClass} ${
            isRoughDay ? orb.roughClass : orb.warmClass
          }`}
          initial={{
            borderRadius: '30% 70% 70% 30% / 30% 30% 70% 70%',
            x: orb.xRange[0],
            y: orb.yRange[0],
          }}
          animate={{
            borderRadius: [
              '30% 70% 70% 30% / 30% 30% 70% 70%',
              '70% 30% 30% 70% / 70% 70% 30% 30%',
            ],
            x: orb.xRange,
            y: orb.yRange,
          }}
          transition={{
            borderRadius: {
              repeat: Infinity,
              repeatType: 'reverse',
              duration: 15,
              ease: 'easeInOut',
            },
            x: {
              repeat: Infinity,
              repeatType: 'reverse',
              duration: orb.driftDuration,
              ease: 'easeInOut',
            },
            y: {
              repeat: Infinity,
              repeatType: 'reverse',
              duration: orb.driftDuration + 1,
              ease: 'easeInOut',
            },
          }}
        />
      ))}
    </div>
  );
}

export default BackgroundOrbs;

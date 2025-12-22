import React from 'react';
import ParticlesBg from 'particles-bg';
import { Modal } from './Modal';
import Logo from '../Logo';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AboutModal({ isOpen, onClose }: AboutModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="About Lab Partners System">
      <div className="relative overflow-hidden rounded-lg min-h-[400px] flex flex-col items-center justify-center p-6">
        {/* Particle background */}
        <div className="absolute inset-0 z-0">
          <ParticlesBg 
            type="cobweb" 
            bg={true} 
            color="#dbeafe"
            num={40}
          />
        </div>
        {/* Content */}
        <div className="relative z-10 flex flex-col items-center justify-center gap-6">
          <Logo className="h-24 w-auto mb-2" />
          <h2 className="text-2xl font-bold text-primary-700 mb-1 text-center drop-shadow-lg">Lab Partners Clinical Laboratories</h2>
          <p className="text-lg font-semibold text-gray-700 mb-2 text-center">System Version <span className="text-primary-600 font-bold">2.02</span></p>
          <div className="flex flex-col items-center gap-2 mb-4">
            <span className="text-base text-gray-600 text-center">Developed exclusively for Lab Partners Clinical Laboratories</span>
            <div className="flex items-center gap-2 mt-2">
              {/* Soxfort Solutions logo placeholder */}
              <div className="h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center">
                {/* TODO: Replace with Soxfort Solutions logo image if available */}
                <span className="text-xs text-gray-500">Soxfort</span>
              </div>
              <span className="text-base font-semibold text-gray-700">Soxfort Solutions</span>
            </div>
            <span className="italic text-primary-500 text-sm mt-1">Intuitive Innovation</span>
          </div>
        </div>
      </div>
    </Modal>
  );
} 
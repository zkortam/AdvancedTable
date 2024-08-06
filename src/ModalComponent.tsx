import React from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const ModalComponent: React.FC<ModalProps> = ({ isOpen, onClose, onConfirm }) => {
  if (!isOpen) return null;

  return (
    <div className="modal" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <p>Would you like to reset the table?</p>
        <div className="modal-buttons">
          <button onClick={onConfirm} className="confirm">Yes</button>
          <button onClick={onClose} className="cancel">Cancel</button>
        </div>
      </div>
    </div>
  );
};

export default ModalComponent;

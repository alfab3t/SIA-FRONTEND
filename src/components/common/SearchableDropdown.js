import { useState, useRef, useEffect } from "react";
import Label from "./Label";
import PropTypes from "prop-types";

const SearchableDropdown = ({
  arrData = [],
  label = "",
  forInput,
  isRequired = false,
  isDisabled = false,
  errorMessage,
  showLabel = true,
  value = "",
  onChange,
  placeholder = "Cari dan pilih...",
  ...props
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredData, setFilteredData] = useState(arrData);
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  // Filter data berdasarkan search term
  useEffect(() => {
    if (!searchTerm) {
      setFilteredData(arrData);
    } else {
      const filtered = arrData.filter(item =>
        item.Text.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredData(filtered);
    }
  }, [searchTerm, arrData]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  const handleToggleDropdown = () => {
    if (!isDisabled) {
      setIsOpen(!isOpen);
      setSearchTerm("");
    }
  };

  const handleSelectItem = (item) => {
    if (onChange) {
      onChange({ target: { value: item.Value } });
    }
    setIsOpen(false);
    setSearchTerm("");
  };

  const getSelectedText = () => {
    const selectedItem = arrData.find(item => item.Value === value);
    return selectedItem ? selectedItem.Text : placeholder;
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      setSearchTerm("");
    }
  };

  return (
    <div className="mb-3" ref={dropdownRef}>
      {showLabel && (
        <Label
          required={isRequired}
          text={label}
          htmlFor={forInput}
          tooltip={label}
        />
      )}
      
      <div className="position-relative">
        <div
          className={`form-select rounded-4 blue-element d-flex justify-content-between align-items-center ${
            isDisabled ? 'disabled' : ''
          } ${value ? '' : 'text-muted'}`}
          onClick={handleToggleDropdown}
          style={{ 
            cursor: isDisabled ? 'not-allowed' : 'pointer',
            minHeight: '38px'
          }}
        >
          <span className="text-truncate">{getSelectedText()}</span>
          <i className={`bi bi-chevron-${isOpen ? 'up' : 'down'}`}></i>
        </div>

        {isOpen && (
          <div 
            className="dropdown-menu show w-100 shadow-lg border-0 rounded-4 mt-1"
            style={{ 
              maxHeight: '300px',
              overflowY: 'auto',
              zIndex: 1050
            }}
          >
            {/* Search Input */}
            <div className="p-2 border-bottom">
              <input
                ref={searchInputRef}
                type="text"
                className="form-control form-control-sm"
                placeholder="Cari mahasiswa..."
                value={searchTerm}
                onChange={handleSearchChange}
                onKeyDown={handleKeyDown}
              />
            </div>

            {/* Options List */}
            <div className="py-1">
              {filteredData.length > 0 ? (
                filteredData.map((item, index) => (
                  <div
                    key={item.Value || index}
                    className={`dropdown-item px-3 py-2 ${
                      value === item.Value ? 'active' : ''
                    }`}
                    onClick={() => handleSelectItem(item)}
                    style={{ 
                      cursor: 'pointer',
                      borderRadius: '0.375rem',
                      margin: '2px 4px'
                    }}
                  >
                    <div className="d-flex flex-column">
                      <span className="fw-medium">{item.Text}</span>
                      {item.Value && (
                        <small className="text-muted">ID: {item.Value}</small>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="dropdown-item-text text-muted px-3 py-2">
                  {searchTerm ? 'Tidak ada data yang ditemukan' : 'Tidak ada data'}
                </div>
              )}
            </div>

            {/* Show count if many items */}
            {arrData.length > 10 && (
              <div className="border-top px-3 py-2">
                <small className="text-muted">
                  Menampilkan {filteredData.length} dari {arrData.length} data
                </small>
              </div>
            )}
          </div>
        )}
      </div>

      {errorMessage && (
        <span className="fw-normal text-danger small">{errorMessage}</span>
      )}
    </div>
  );
};

SearchableDropdown.propTypes = {
  arrData: PropTypes.arrayOf(
    PropTypes.shape({
      Value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      Text: PropTypes.string.isRequired,
    })
  ),
  label: PropTypes.string,
  forInput: PropTypes.string,
  isRequired: PropTypes.bool,
  isDisabled: PropTypes.bool,
  errorMessage: PropTypes.string,
  showLabel: PropTypes.bool,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onChange: PropTypes.func,
  placeholder: PropTypes.string,
};

export default SearchableDropdown;
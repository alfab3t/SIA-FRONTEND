import { forwardRef, useState, useRef, useEffect } from "react";
import Label from "./Label";
import PropTypes from "prop-types";

const DropDown = (
  {
    arrData,
    type = "pilih",
    label = "",
    forInput,
    isRequired = false,
    isDisabled = false,
    errorMessage,
    showLabel = true,
    searchable = false,
    ...props
  },
  ref
) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredData, setFilteredData] = useState(arrData || []);
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  // Update filtered data when arrData changes
  useEffect(() => {
    setFilteredData(arrData || []);
  }, [arrData]);

  // Filter data based on search term
  useEffect(() => {
    if (!searchable || !arrData) {
      setFilteredData(arrData || []);
      return;
    }

    if (!searchTerm.trim()) {
      setFilteredData(arrData);
    } else {
      const filtered = arrData.filter(item =>
        item.Text.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredData(filtered);
    }
  }, [searchTerm, arrData, searchable]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Get selected item text
  const getSelectedText = () => {
    if (!props.value || !arrData) return "";
    const selectedItem = arrData.find(item => item.Value === props.value);
    return selectedItem ? selectedItem.Text : "";
  };

  // Handle option selection
  const handleOptionSelect = (value, text) => {
    setIsOpen(false);
    setSearchTerm("");
    
    // Create synthetic event for compatibility
    const syntheticEvent = {
      target: {
        name: forInput,
        value: value
      }
    };
    
    if (props.onChange) {
      props.onChange(syntheticEvent);
    }
  };

  // Handle search input change
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  // Handle dropdown toggle
  const handleDropdownToggle = () => {
    if (isDisabled) return;
    setIsOpen(!isOpen);
    if (!isOpen && searchable) {
      // Focus search input when opening
      setTimeout(() => {
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
      }, 100);
    }
  };

  let placeholder = "";
  switch (type) {
    case "pilih":
      placeholder = "-- Pilih " + label + " --";
      break;
    case "semua":
      placeholder = "-- Semua --";
      break;
    default:
      break;
  }

  // If not searchable, render regular dropdown
  if (!searchable) {
    return (
      <div className="mb-3">
        {showLabel && (
          <Label
            required={isRequired}
            text={label}
            htmlFor={forInput}
            tooltip={label}
          />
        )}
        <select
          className="form-select rounded-4 blue-element"
          id={forInput}
          name={forInput}
          ref={ref}
          disabled={isDisabled}
          {...props}
        >
          <option value="" disabled>
            {placeholder}
          </option>
          {arrData &&
            arrData.length > 0 &&
            arrData.map((data) => {
              return (
                <option key={data.Value} value={data.Value}>
                  {data.Text}
                </option>
              );
            })}
        </select>
        {errorMessage ? (
          <span className="fw-normal text-danger"> {errorMessage}</span>
        ) : (
          ""
        )}
      </div>
    );
  }

  // Render searchable dropdown
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
          } ${isOpen ? 'focus' : ''}`}
          style={{
            cursor: isDisabled ? 'not-allowed' : 'pointer',
            backgroundColor: isDisabled ? '#e9ecef' : 'white'
          }}
          onClick={handleDropdownToggle}
        >
          <span className={props.value ? 'text-dark' : 'text-muted'}>
            {props.value ? getSelectedText() : placeholder}
          </span>
          <i className={`fas fa-chevron-${isOpen ? 'up' : 'down'}`}></i>
        </div>
        
        {isOpen && (
          <div
            className="position-absolute w-100 bg-white border rounded-4 shadow-sm dropdown-scroll-hidden"
            style={{
              top: '100%',
              zIndex: 1050,
              maxHeight: '300px',
              overflowY: 'auto',
              scrollbarWidth: 'none', /* Firefox */
              msOverflowStyle: 'none', /* Internet Explorer 10+ */
            }}
          >
            <div className="p-2 border-bottom">
              <input
                ref={searchInputRef}
                type="text"
                className="form-control form-control-sm rounded-3"
                placeholder={`Cari ${label.toLowerCase()}...`}
                value={searchTerm}
                onChange={handleSearchChange}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
            
            <div className="py-1">
              {filteredData.length > 0 ? (
                filteredData.map((item) => (
                  <div
                    key={item.Value}
                    className={`px-3 py-2 cursor-pointer hover-bg-light ${
                      props.value === item.Value ? 'bg-primary text-white' : ''
                    }`}
                    style={{ cursor: 'pointer' }}
                    onClick={() => handleOptionSelect(item.Value, item.Text)}
                    onMouseEnter={(e) => {
                      if (props.value !== item.Value) {
                        e.target.style.backgroundColor = '#f8f9fa';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (props.value !== item.Value) {
                        e.target.style.backgroundColor = 'transparent';
                      }
                    }}
                  >
                    {item.Text}
                  </div>
                ))
              ) : (
                <div className="px-3 py-2 text-muted">
                  Tidak ada data yang ditemukan
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      
      {errorMessage ? (
        <span className="fw-normal text-danger"> {errorMessage}</span>
      ) : (
        ""
      )}
    </div>
  );
};

export default forwardRef(DropDown);

DropDown.propTypes = {
  arrData: PropTypes.arrayOf(
    PropTypes.shape({
      Value: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
        .isRequired,
      Text: PropTypes.string.isRequired,
    })
  ).isRequired,
  type: PropTypes.string,
  label: PropTypes.string,
  forInput: PropTypes.string,
  isRequired: PropTypes.bool,
  isDisabled: PropTypes.bool,
  errorMessage: PropTypes.string,
  showLabel: PropTypes.bool,
  searchable: PropTypes.bool,
};

// © 2023 Amazon Web Services, Inc. or its affiliates. All Rights Reserved.
// This AWS Content is provided subject to the terms of the AWS Customer Agreement available at
// http://aws.amazon.com/agreement or other written agreement between Customer and either
// Amazon Web Services, Inc. or Amazon Web Services EMEA SARL or both.
import React, { useState, useEffect, useRef } from "react";
import {
  Box,
  Button,
  Header,
  Pagination,
  Table,
  TextFilter,
  SpaceBetween,
  CollectionPreferences,
  Modal,
  Select,
} from "@awsui/components-react";
import { useCollection } from "@awsui/collection-hooks";
import { getSessionList } from "../Shared/RequestService";
import Status from "../Shared/Status";
import Details from "../Shared/Details";
import "../../index.css";
import { CSVLink } from "react-csv";

function convertAwsDateTime(awsDateTime) {
  // Parse AWS datetime string into a Date object
  const date = new Date(awsDateTime);
  // Format date in user-friendly format
  const options = {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  };
  const userFriendlyFormat = date.toLocaleString('en-US', options);
  return userFriendlyFormat
}

const COLUMN_DEFINITIONS = [
  {
    id: "id",
    sortingField: "id",
    header: "Id",
    cell: (item) => item.id,
    width: 50,
  },
  {
    id: "email",
    sortingField: "email",
    header: "Requester",
    cell: (item) => item.email,
    minWidth: 160,
  },
  {
    id: "account",
    sortingField: "account",
    header: "Account",
    cell: (item) => item.accountName,
    minWidth: 10,
  },
  {
    id: "role",
    sortingField: "role",
    header: "Role",
    cell: (item) => item.role,
    minWidth: 10,
  },
  {
    id: "startTime",
    sortingField: "startTime",
    header: "StartTime",
    cell: (item) => convertAwsDateTime(item.startTime),
    minWidth: 160,
  },
  {
    id: "duration",
    sortingField: "duration",
    header: "Duration",
    cell: (item) => `${item.duration} hours`,
    maxWidth: 120,
  },
  {
    id: "justification",
    sortingField: "justification",
    header: "Justification",
    cell: (item) => item.justification,
    maxWidth: 200,
  },
  {
    id: "approver",
    sortingField: "approver",
    header: "Approver",
    cell: (item) => item.approver || "-",
    minWidth: 10,
  },
  {
    id: "status",
    sortingField: "status",
    header: "Status",
    cell: (item) => <Status status={item.status} />,
    minWidth: 10,
  },
];

const MyCollectionPreferences = ({ preferences, setPreferences }) => {
  return (
    <CollectionPreferences
      title="Preferences"
      confirmLabel="Confirm"
      cancelLabel="Cancel"
      preferences={preferences}
      onConfirm={({ detail }) => setPreferences(detail)}
      pageSizePreference={{
        title: "Page size",
        options: [
          { value: 10, label: "10 Requests" },
          { value: 30, label: "30 Requests" },
          { value: 50, label: "50 Requests" },
        ],
      }}
      wrapLinesPreference={{
        label: "Wrap lines",
        description: "Check to see all the text and wrap the lines",
      }}
      visibleContentPreference={{
        title: "Select visible columns",
        options: [
          {
            label: "Request properties",
            options: [
              // { id: "id", label: "Id", editable: false },
              { id: "email", label: "Requester" },
              { id: "account", label: "Account" },
              { id: "role", label: "Role" },
              { id: "duration", label: "Duration" },
              { id: "startTime", label: "StartTime" },
              { id: "justification", label: "Justification" },
              { id: "approver", label: "Approver" },
              { id: "status", label: "Status" },
            ],
          },
        ],
      }}
    />
  );
};

function EmptyState({ title, subtitle, action }) {
  return (
    <Box textAlign="center">
      <Box variant="strong">{title}</Box>
      <Box variant="p" padding={{ bottom: "s" }}>
        {subtitle}
      </Box>
      {action}
    </Box>
  );
}

const defaultStatus = {
  label: "All Status",
  value: "0",
};

function AuditApprovals(props) {
  const [allItems, setAllItems] = useState([]);
  const [preferences, setPreferences] = useState({
    pageSize: 10,
    visibleContent: [
      "email",
      "account",
      "role",
      "duration",
      "startTime",
      "justification",
      "approver",
      "status",
    ],
  });

  const [selectedOption, setSelectedOption] = useState(defaultStatus);
  const selectStatusOptions = prepareSelectOptions("status", defaultStatus);

  function prepareSelectOptions(field, defaultOption) {
    const optionSet = [];
    // Building a non redundant list of the field passed as parameter.

    allItems.forEach((item) => {
      if (optionSet.indexOf(item[field]) === -1) {
        optionSet.push(item[field]);
      }
    });
    optionSet.sort();

    // The first element is the default one.
    const options = [defaultOption];

    // Adding the other element ot the list.
    optionSet.forEach((item, index) =>
      options.push({ label: item, value: (index + 1).toString() })
    );
    return options;
  }

  function matchesStatus(item, selectedStatus) {
    return (
      selectedStatus === defaultStatus || item.status === selectedStatus.label
    );
  }

  const SEARCHABLE_COLUMNS = COLUMN_DEFINITIONS.map((item) => item.id);

  const {
    items,
    actions,
    filteredItemsCount,
    collectionProps,
    filterProps,
    paginationProps,
  } = useCollection(allItems, {
    filtering: {
      filteringFunction: (item, filteringText) => {
        if (!matchesStatus(item, selectedOption)) {
          return false;
        }
        const filteringTextLowerCase = filteringText.toLowerCase();

        return SEARCHABLE_COLUMNS.map((key) => item[key]).some(
          (value) =>
            typeof value === "string" &&
            value.toLowerCase().indexOf(filteringTextLowerCase) > -1
        );
      },
      empty: (
        <EmptyState title="No requests" subtitle="No requests to display." />
      ),
      noMatch: (
        <EmptyState
          title="No matches"
          subtitle="Your search didn't return any records."
          action={
            <Button onClick={() => actions.setFiltering("")}>
              Clear filter
            </Button>
          }
        />
      ),
    },
    pagination: { pageSize: preferences.pageSize },
    sorting: {},
    selection: {},
  });

  const { selectedItems } = collectionProps;
  const [tableLoading, setTableLoading] = useState(true);
  const [visible, setVisible] = useState(false);
  const [refreshLoading, setRefreshLoading] = useState(false);
  const [expand, setExpand] = useState(false);
  const csvLink = useRef();

  useEffect(() => {
    views();
    props.addNotification([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function updateItems(items) {
    items.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
    const data = items.map((item) => {
      if (
        item.status === "ended" ||
        item.status === "revoked" ||
        item.status === "in progress" ||
        item.status === "scheduled"
      ) {
        item.status = "approved";
      }
      return item;
    });
    return data;
  }

  function views() {
    getSessionList().then((items) => {
      updateItems(items).then((items) => {
        setAllItems(items);
        setTableLoading(false);
        setRefreshLoading(false);
      });
    });
  }

  function handleRefresh() {
    setRefreshLoading(true);
    setTableLoading(true);
    props.addNotification([]);
    views();
  }

  function handleSelect() {
    setVisible(true);
    setExpand(false);
  }

  function handleDownload() {
    csvLink.current.link.click();
  }

  return (
    <div className="container">
      <Table
        {...collectionProps}
        resizableColumns="true"
        loading={tableLoading}
        loadingText="Fetching requests"
        // sortingColumn={SORT_COLUMN}
        header={
          <Header
            counter={
              selectedItems.length
                ? `(${selectedItems.length}/${allItems.length})`
                : `(${allItems.length})`
            }
            actions={
              <SpaceBetween size="s" direction="horizontal">
                <Button
                  iconName="refresh"
                  onClick={handleRefresh}
                  loading={refreshLoading}
                />
                <Button
                  disabled={selectedItems.length === 0}
                  // variant="primary"
                  onClick={handleSelect}
                >
                  View Details
                </Button>
                <div>
                  <Button
                    disabled={allItems.length === 0}
                    variant="primary"
                    onClick={handleDownload}
                    iconName="download"
                    iconAlign="left"
                  >
                    Download
                  </Button>
                  <CSVLink
                    data={allItems}
                    filename="approvals.csv"
                    className="hidden"
                    ref={csvLink}
                    target="_blank"
                  />
                </div>
              </SpaceBetween>
            }
          >
            Approvals
          </Header>
        }
        filter={
          <div className="input-container">
            <TextFilter
              {...filterProps}
              filteringPlaceholder="Find request"
              countText={filteredItemsCount}
              className="input-filter"
            />
            <Select
              {...filterProps}
              className="select-filter engine-filter"
              selectedAriaLabel="Selected"
              options={selectStatusOptions}
              selectedOption={selectedOption}
              onChange={({ detail }) =>
                setSelectedOption(detail.selectedOption)
              }
              ariaDescribedby={null}
            />
          </div>
        }
        columnDefinitions={COLUMN_DEFINITIONS}
        visibleColumns={preferences.visibleContent}
        pagination={<Pagination {...paginationProps} />}
        preferences={
          <MyCollectionPreferences
            preferences={preferences}
            setPreferences={setPreferences}
          />
        }
        items={items}
        selectionType="single"
      />
      <div>
        {selectedItems.length ? (
          <Modal
            onDismiss={() => {
              setVisible(false);
              setExpand(true);
            }}
            visible={visible}
            closeAriaLabel="Close modal"
            size="large"
            footer={
              <Box float="right">
                <SpaceBetween direction="horizontal" size="s">
                  <Button variant="link" onClick={() => setVisible(false)}>
                    Cancel
                  </Button>
                </SpaceBetween>
              </Box>
            }
            header="Request details"
          >
            <Details item={selectedItems[0]} status={expand} />
          </Modal>
        ) : null}
      </div>
    </div>
  );
}

export default AuditApprovals;

import {
  CheckOutlined,
  CloseOutlined,
  EditOutlined,
  MinusOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import { Button, Input, message, Space, Tree, Typography } from "antd";
import Item from "antd/lib/list/Item";
import exp from "constants";
import moment from "moment";
import React, { useEffect, useRef, useState } from "react";
import { useToken } from "../../auth";
const { TreeNode } = Tree;
const { Text } = Typography;
const { DirectoryTree } = Tree;

type treeProps = {
  value: string;
  onSelectChange: (value: string) => void;
  labels: array;
  readonly: boolean;
};

const CaseLabelTree: React.FC = ({
  value,
  onSelectChange,
  labels,
  readonly,
}: treeProps) => {
  const [treeData, setTreeData] = useState([]);
  const [selected, setSelected] = useState([]);
  const [expandedKeys, setExpandedKeys] = useState([]);
  const inputRef = useRef(null);
  const { token } = useToken();

  useEffect(() => {
    const tree: DataNode[] = [];
    labels.forEach((labelPath) => {
      let currTree: array = tree;
      labelPath
        .slice()
        .reverse()
        .forEach((label) => {
          let labelIn = false;
          currTree.forEach((element) => {
            if (element.key === label.id.toString()) {
              labelIn = true;
              currTree = element.children;
            }
          });
          if (!labelIn) {
            currTree.push({
              key: label.id.toString(),
              value: label.name,
              isEditable: false,
              children: [],
            });
          }
        });
    });
    setTreeData(tree);
  }, [labels]);

  const onExpand = (keys, a, b) => {
    setExpandedKeys(keys);
  };

  const onSelect = (keys) => {
    onSelectChange(keys[0]);
    setSelected(keys);
  };

  const renderTreeNodes = (data) =>
    data.map((item) => {
      if (readonly) {
        item.title = (
          <Space>
            <Text>{item.value}</Text>
          </Space>
        );
      } else {
        if (item.isEditable) {
          item.title = (
            <Space>
              <Input
                defaultValue={item.value}
                ref={inputRef}
                autoFocus
                onFocus={(e) => e.currentTarget.select()}
                size="small"
              />
              <CloseOutlined
                onClick={() => {
                  item.isEditable = false;
                }}
              />
              <CheckOutlined onClick={() => onSave(item)} />
            </Space>
          );
        } else {
          item.title = (
            <Space>
              <Text>{item.value}</Text>
              <EditOutlined onClick={() => onEdit(item)} />
              <PlusOutlined onClick={() => onAdd(item)} />
              <MinusOutlined onClick={() => onDelete(item)} />
            </Space>
          );
        }
      }

      if (item.children) {
        return (
          <TreeNode title={item.title} key={item.key} dataRef={item}>
            {renderTreeNodes(item.children)}
          </TreeNode>
        );
      }

      return <TreeNode {...item} />;
    });

  const onAdd = async (item = null) => {
    console.log("add");
    const response = await saveLabel(null, "default", item ? item.key : null);
    const newKey = response.id.toString();
    const newItem = {
      value: response.name,
      key: newKey,
      parentKey: response.parent_id,
      isEditable: true,
      children: [],
    };
    if (item) {
      item.children.push(newItem);
    } else {
      treeData.push(newItem);
    }
    setTreeData(treeData.slice());
    setSelected([newKey]);
    if (expandedKeys.includes(item.key)) {
      setExpandedKeys(expandedKeys.filter((item) => item !== item.key));
    }
  };

  const onDelete = async (item) => {
    console.log("delete");
    const caseResponse = await fetch(
      `${process.env.REACT_APP_SURGE_COLLECTION_CASE_COUNT_URL}?label_id=${item.key}`,
      {
        headers: {
          Authorization: token,
        },
      }
    );
    const result = await caseResponse.json();
    if (result.count > 0) {
      message.warning({
        content: "该分类下有收藏数据, 不能删除此分类",
        style: {
          marginTop: "40vh",
        },
      });
    } else {
      const deleteResponse = await fetch(
        process.env.REACT_APP_SURGE_COLLECTION_CASE_LABEL_URL,
        {
          method: "DELETE",
          headers: {
            Authorization: token,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id: item.key,
          }),
        }
      );
      if (deleteResponse.ok) {
        deleteNode(item.key, treeData);
        setTreeData(treeData.slice());
      } else {
        message.warning({
          content: response.message,
          style: {
            marginTop: "40vh",
          },
        });
      }
    }
  };

  const deleteNode = (key, data) => {
    data.forEach((item, index) => {
      if (item.key === key) {
        data.splice(index, 1);
        const queue = [item];
        while (queue.length > 0) {
          let i = queue.shift();
          if (i.key === selected[0]) {
            onSelect([]);
          } else {
            i.children.forEach((element) => queue.push(element));
          }
        }
        return;
      } else {
        if (item.children) {
          deleteNode(key, item.children);
        }
      }
    });
  };

  const onEdit = (item) => {
    item.isEditable = true;
    setTreeData(treeData.slice());
  };

  const onSave = async (item) => {
    const name = inputRef.current.input.value;
    const result = await saveLabel(item.key, name, item.parentKey);
    item.value = name;
    item.key = result.id.toString();
    item.isEditable = false;
    setTreeData(treeData.slice());
    onSelect([item.key]);
  };

  const saveLabel = async (id, name, parentId) => {
    const response = await fetch(
      process.env.REACT_APP_SURGE_COLLECTION_CASE_LABEL_URL,
      {
        method: "POST",
        headers: {
          Authorization: token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: id,
          name: name,
          parentId: parentId,
        }),
      }
    );
    return response.json();
  };

  return (
    <>
      <DirectoryTree
        onSelect={onSelect}
        selectedKeys={selected}
        onExpand={onExpand}
        expandedKeys={expandedKeys}
      >
        {renderTreeNodes(treeData)}
      </DirectoryTree>
      <br />
      {readonly ? null : (
        <Button onClick={() => onAdd()} size="small">
          新增根结点
        </Button>
      )}
    </>
  );
};

export default CaseLabelTree;

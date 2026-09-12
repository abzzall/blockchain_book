// SPDX-License-Identifier: MIT
pragma solidity ^0.8.37;

contract StudentRegistry {
    struct Student {
        string name;
        uint16 score;
        uint64 updatedAt;
        bool exists;
    }

    error InstructorOnly(address caller);
    error InvalidStudentAddress();
    error EmptyName();
    error ScoreOutOfRange(uint16 supplied);
    error StudentNotFound(address student);

    event StudentSaved(address indexed student, string name, uint16 score, bool created);

    address public immutable instructor;
    string public courseName;
    uint256 public studentCount;
    mapping(address student => Student record) private students;

    constructor(string memory courseName_) {
        if (bytes(courseName_).length == 0) revert EmptyName();
        instructor = msg.sender;
        courseName = courseName_;
    }

    modifier onlyInstructor() {
        if (msg.sender != instructor) revert InstructorOnly(msg.sender);
        _;
    }

    function saveStudent(address student, string calldata name, uint16 score) external onlyInstructor {
        if (student == address(0)) revert InvalidStudentAddress();
        if (bytes(name).length == 0) revert EmptyName();
        if (score > 100) revert ScoreOutOfRange(score);

        bool created = !students[student].exists;
        if (created) studentCount += 1;
        students[student] = Student(name, score, uint64(block.timestamp), true);
        emit StudentSaved(student, name, score, created);
    }

    function getStudent(address student) external view returns (Student memory) {
        Student memory record = students[student];
        if (!record.exists) revert StudentNotFound(student);
        return record;
    }
}

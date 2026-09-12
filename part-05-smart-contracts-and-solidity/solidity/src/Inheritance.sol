// SPDX-License-Identifier: MIT
pragma solidity 0.8.37;

/// An interface declares what can be called and supplies no implementation.
/// It cannot hold state and cannot be deployed.
interface ICounter {
    function value() external view returns (uint256);
    function bump() external;
}

/// An abstract contract may implement some of what it declares and leave the
/// rest to whoever derives from it. It cannot be deployed either.
abstract contract CounterBase is ICounter {
    uint256 internal _value;

    function value() external view returns (uint256) {
        return _value;
    }

    /// Declared but not implemented, which is what makes the contract
    /// abstract. A derived contract must supply it.
    function bump() external virtual;
}

contract SimpleCounter is CounterBase {
    function bump() external override {
        _value += 1;
    }
}

// --------------------------------------------------------------------------
// Linearization: which override runs, and in what order
//
// Base contracts are listed from most base-like to most derived, and `super`
// calls the next contract along that linearized order rather than a named
// parent. The trace below records the order at run time so a test can assert
// it instead of taking it on trust.
// --------------------------------------------------------------------------

contract Root {
    string[] public trace;

    function record(string memory who) internal {
        trace.push(who);
    }

    function traceLength() external view returns (uint256) {
        return trace.length;
    }

    function step() public virtual {
        record("Root");
    }
}

contract Left is Root {
    function step() public virtual override {
        record("Left");
        super.step();
    }
}

contract Right is Root {
    function step() public virtual override {
        record("Right");
        super.step();
    }
}

/// Derives from both, so the override must name both bases explicitly.
contract Diamond is Left, Right {
    function step() public override(Left, Right) {
        record("Diamond");
        super.step();
    }
}

// --------------------------------------------------------------------------
// Constructors run in linearized order, whatever order they are written in
// --------------------------------------------------------------------------

contract CtorRoot {
    string[] public order;

    constructor() {
        order.push("CtorRoot");
    }

    function orderLength() external view returns (uint256) {
        return order.length;
    }
}

contract CtorA is CtorRoot {
    constructor() {
        order.push("CtorA");
    }
}

contract CtorB is CtorRoot {
    constructor() {
        order.push("CtorB");
    }
}

/// The bases are listed A then B, so they run in that order -- note that the
/// listing order in `is`, not anything else, is what decides.
contract CtorDerived is CtorA, CtorB {
    constructor() {
        order.push("CtorDerived");
    }
}

// --------------------------------------------------------------------------
// Passing arguments to base constructors
// --------------------------------------------------------------------------

contract Named {
    string public name;

    constructor(string memory name_) {
        name = name_;
    }
}

contract Versioned {
    uint256 public version;

    constructor(uint256 version_) {
        version = version_;
    }
}

/// Constant base-constructor arguments can be written in the inheritance list.
contract FixedMetadata is Named("fixed"), Versioned(1) {}

/// Arguments that depend on the derived constructor are supplied beside it.
contract ConfiguredMetadata is Named, Versioned {
    constructor(string memory name_, uint256 version_)
        Named(name_)
        Versioned(version_)
    {}
}

import hre from 'hardhat';
const { waffle } = hre;

import { AnteLiquitySupplyTest, AnteLiquitySupplyTest__factory } from '../../typechain';

import { evmSnapshot, evmRevert } from '../helpers';
import { expect } from 'chai';

describe('AnteLiquitySupplyTest', function () {
  let test: AnteLiquitySupplyTest;

  let globalSnapshotId: string;

  before(async () => {
    globalSnapshotId = await evmSnapshot();

    const [deployer] = waffle.provider.getWallets();
    const factory = (await hre.ethers.getContractFactory('AnteLiquitySupplyTest', deployer)) as AnteLiquitySupplyTest__factory;
    test = await factory.deploy();
    await test.deployed();
  });

  after(async () => {
    await evmRevert(globalSnapshotId);
  });

  it('should pass', async () => {
    expect(await test.checkTestPasses()).to.be.true;
  });
}); 
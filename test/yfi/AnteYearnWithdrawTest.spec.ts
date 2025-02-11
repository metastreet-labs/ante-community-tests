import hre from 'hardhat';
const { waffle, ethers } = hre;

import { AnteYearnWithdrawTest, AnteYearnWithdrawTest__factory, BasicERC20, InterfaceYearnVault } from '../../typechain';

import { evmSnapshot, evmRevert, evmMineBlocks, evmIncreaseTime } from '../helpers';
import { expect } from 'chai';
import { BigNumber } from 'ethers';

const setStorageAt = async (address: any, index: any, value: any) => {
  await ethers.provider.send("hardhat_setStorageAt", [address, index, value]);
  await ethers.provider.send("evm_mine", []); // Just mines to the next block
};

const toBytes32 = (bn: BigNumber) => {
  return ethers.utils.hexlify(ethers.utils.zeroPad(bn.toHexString(), 32));
};

describe('AnteYearnWithdrawTest', function () {
  let test: AnteYearnWithdrawTest;

  let globalSnapshotId: string;

  const [deployer] = waffle.provider.getWallets();
  const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
  const yUSDC_VAULT = "0x5f18c75abdae578b483e5f43f12a39cf75b973a9";

  let yVault: InterfaceYearnVault;
  let USDC_CONTRACT: BasicERC20;

  before(async () => {
    globalSnapshotId = await evmSnapshot();
    const factory = (await hre.ethers.getContractFactory('AnteYearnWithdrawTest', deployer)) as AnteYearnWithdrawTest__factory;
    yVault = await hre.ethers.getContractAt('InterfaceYearnVault', yUSDC_VAULT, deployer);
    USDC_CONTRACT = await hre.ethers.getContractAt('BasicERC20', USDC_ADDRESS, deployer);

    
    test = await factory.deploy(yUSDC_VAULT, USDC_ADDRESS);
    await test.deployed();

    // Can't find slot so updating every single slot possible
    // Info about setStorageAt can be found here: https://kndrck.co/posts/local_erc20_bal_mani_w_hh/
    // 256 is just an arbitrary number. The actual index will usually be less than 10.
    // As soon as the index is found, the next iteration will throw an error and break the loop.
    try {
      for(let i = 0; i < 256; i++) {
        const index = ethers.utils.solidityKeccak256(
          ["uint256", "uint256"],
          [i, test.address] // slot, address
        );
    
        await setStorageAt(
          yUSDC_VAULT,
          index.toString(),
          toBytes32(BigNumber.from('100000')).toString()
        );
      }
    } catch(e) {}

  });

  after(async () => {
    await evmRevert(globalSnapshotId);
  });

  it('balance of test should be 100000', async () => {
    const balance = await yVault.balanceOf(test.address);
    expect(balance).to.equal('100000');
  });

  it('should pass', async () => {

    await test.withdraw();
    await evmIncreaseTime(960); // 16 minutes
    await evmMineBlocks(1);

    // Possibility of earning rewards. So as long as it's 100k or greater, the withdraw was successful
    expect(await USDC_CONTRACT.balanceOf(test.address)).to.be.gt('99999');
    
    expect(await test.checkTestPasses()).to.be.true;
  });
});

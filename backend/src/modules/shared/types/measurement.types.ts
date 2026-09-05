export interface ChudiMeasurementData {
  height?: string;
  chest?: string;
  Waist_HIP_Height?: string;
  Waist_HIP_Loose?: string;
  SeatLoose?: string;
  Front_Neck_Height?: string;
  Back_Neck_Height?: string;
  Sleeve_Length?: string;
  Sleeve_Round?: string;
  Middle_Hand_Round?: string;
  Shoulder_Finishing?: string;
  Full_Shoulder?: string;
  Fit_Style?: string;
  FinishingChest?: string;
  FinishingWaist?: string;
  FinishingSeat?: string;
  FlairOpt?: string;
  FlairLoose?: string;
  // fitStyle?: 'A_SIZE' | 'B_TYPE' | 'C_TYPE';
  pantModel?: 'FIT_SLIM' | 'STRAIGHT_PANT';
  pleatModel?: 'COMFORT' | 'FORMAL';
  requiredClothNormal?: string;
  requiredClothModel?: string;
  pantHeight?: string;
  bottomLoose?: string;
  reference?: string;
  notes?: string;
}

export interface BlouseMeasurementData {
  height?: string;
  Upper_Chest?: string;
  Center_Chest?: string;
  Shoulder_Finishing?: string;
  Sleeve_Length?: string;
  Sleeve_Round?: string;
  Middle_Hand_Loose?: string;
  Front_Neck_Height?: string;
  Back_Neck_Height?: string;
  Waist_Loose?: string;
  Front_Point_Center?: string;
  Full_Shoulder?: string;
  Arm_Round?: string;
  Required_Cloth_for_Normal?: string;
  Required_Cloth_for_Model?: string;
  Model_Type?: string;
  Enter_model_type?: string;
  notes?: string;
}

export interface LadiesPantMeasurementData {
  height?: string;
  Waist?: string;
  Seat?: string;
  Thigh?: string;
  Knee?: string;
  Bottom?: string;
  Zip_Length?: string;
  Total_Round?: string;
  Pant_Model?: string;
  pantModel?: 'FIT_SLIM' | 'STRAIGHT_PANT';
  pleatModel?: 'COMFORT' | 'FORMAL';
  Required_Cloth_for_Normal?: string;
  Required_Cloth_for_Model?: string;
  Model_Type?: string;
  Enter_model_type?: string;
  notes?: string;
}


export interface KidsMeasurementData {
  height?: string;
  Body_Loose?: string;
  Waist_Height?: string;
  Waist_Loose?: string;
  Hip_Loose?: string;
  Front_Neck_Height?: string;
  Back_Neck_Height?: string;
  Hand_Height?: string;
  Hand_Loose?: string;
  Middle_Hand_Loose?: string;
  Shoulder_Finishing?: string;
  Full_Shoulder?: string;
  Bottom_Height?: string;
  Body_Part_Height?: string;
  Measurement_Reference?: string;
  Model_Type?: string;
  Enter_model_type?: string;
  Required_Cloth_for_Normal?: string;
  Required_Cloth_for_Model?: string;
  notes?: string;
}


export type MeasurementData = ChudiMeasurementData | BlouseMeasurementData | LadiesPantMeasurementData | KidsMeasurementData;
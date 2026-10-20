from app.connectors import HQConnector, SingaporeHRConnector


def test_singapore_connector_maps_local_fields_and_dates() -> None:
    records = SingaporeHRConnector().read_and_map()

    assert len(records) == 20
    alex = next(
        record for record in records if record.employee.work_email == "alex.tan@example.com"
    )
    assert alex.source_id == "SG-0081"
    assert alex.employee.employee_number == "SG-0081"
    assert alex.employee.department == "Finance"
    assert alex.employee.hire_date.isoformat() == "2021-03-15"
    assert alex.employee.employment_status == "active"
    assert alex.raw_payload["Start Date"] == "03/04/2026"


def test_hq_connector_maps_chinese_fields_and_iso_dates() -> None:
    records = HQConnector().read_and_map()

    assert len(records) == 20
    li_wei = next(
        record for record in records if record.employee.work_email == "li.wei@example.com"
    )
    assert li_wei.source_id == "HQ-EMP-71003"
    assert li_wei.employee.display_name == "李伟"
    assert li_wei.employee.department == "财务共享中心"
    assert li_wei.employee.hire_date.isoformat() == "2020-11-23"
    assert li_wei.employee.employment_status == "terminated"
